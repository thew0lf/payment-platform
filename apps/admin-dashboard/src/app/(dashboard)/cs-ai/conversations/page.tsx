'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  MessageSquare,
  Bot,
  Brain,
  Headphones,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  ChevronRight,
  Filter,
  User,
  Building2,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { csAiApi, CSSession, CSTier, CSSessionStatus, CustomerSentiment } from '@/lib/api/cs-ai';

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

function SessionStatusBadge({ status }: { status: CSSessionStatus }) {
  const config: Record<CSSessionStatus, { label: string; color: string }> = {
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

function SentimentIndicator({ sentiment }: { sentiment: CustomerSentiment }) {
  const config: Record<CustomerSentiment, { color: string; label: string }> = {
    HAPPY: { color: 'bg-green-500', label: 'Happy' },
    SATISFIED: { color: 'bg-green-400', label: 'Satisfied' },
    NEUTRAL: { color: 'bg-gray-400', label: 'Neutral' },
    FRUSTRATED: { color: 'bg-amber-400', label: 'Frustrated' },
    ANGRY: { color: 'bg-orange-500', label: 'Angry' },
    IRATE: { color: 'bg-red-500', label: 'Irate' },
  };
  const c = config[sentiment] || config.NEUTRAL;

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full', c.color)} />
      <span className="text-xs text-muted-foreground">{c.label}</span>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <Badge variant="secondary" className="text-xs capitalize">
      {channel}
    </Badge>
  );
}

function formatTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const MOCK_SESSIONS: CSSession[] = [
  {
    id: 'cs_001',
    companyId: 'comp_1',
    customerId: 'cust_1',
    channel: 'chat',
    currentTier: 'AI_REP',
    status: 'ACTIVE',
    issueCategory: 'SHIPPING',
    customerSentiment: 'NEUTRAL',
    sentimentHistory: [],
    escalationHistory: [],
    messages: [],
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'cust_1', firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
  },
  {
    id: 'cs_002',
    companyId: 'comp_1',
    customerId: 'cust_2',
    channel: 'chat',
    currentTier: 'AI_MANAGER',
    status: 'ESCALATED',
    issueCategory: 'REFUND',
    customerSentiment: 'FRUSTRATED',
    sentimentHistory: [],
    escalationHistory: [
      { fromTier: 'AI_REP', toTier: 'AI_MANAGER', reason: 'Refund request exceeds threshold', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
    ],
    messages: [],
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'cust_2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com' },
  },
  {
    id: 'cs_003',
    companyId: 'comp_1',
    customerId: 'cust_3',
    channel: 'email',
    currentTier: 'HUMAN_AGENT',
    status: 'ESCALATED',
    issueCategory: 'BILLING',
    customerSentiment: 'ANGRY',
    sentimentHistory: [],
    escalationHistory: [
      { fromTier: 'AI_REP', toTier: 'AI_MANAGER', reason: 'High sentiment escalation', timestamp: new Date(Date.now() - 45 * 60000).toISOString() },
      { fromTier: 'AI_MANAGER', toTier: 'HUMAN_AGENT', reason: 'Customer requested human agent', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
    messages: [],
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'cust_3', firstName: 'Michael', lastName: 'Brown', email: 'michael@example.com' },
  },
  {
    id: 'cs_004',
    companyId: 'comp_1',
    customerId: 'cust_4',
    channel: 'chat',
    currentTier: 'AI_REP',
    status: 'RESOLVED',
    issueCategory: 'GENERAL',
    customerSentiment: 'HAPPY',
    sentimentHistory: [],
    escalationHistory: [],
    messages: [],
    resolution: {
      type: 'ISSUE_RESOLVED',
      summary: 'Customer inquiry about product availability answered.',
      actionsTaken: ['Provided product information', 'Shared stock availability'],
      followUpRequired: false,
    },
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000 + 8 * 60000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 3600000 + 8 * 60000).toISOString(),
    customer: { id: 'cust_4', firstName: 'Emily', lastName: 'Davis', email: 'emily@example.com' },
  },
  {
    id: 'cs_005',
    companyId: 'comp_1',
    customerId: 'cust_5',
    channel: 'chat',
    currentTier: 'AI_MANAGER',
    status: 'RESOLVED',
    issueCategory: 'CANCELLATION',
    customerSentiment: 'SATISFIED',
    sentimentHistory: [],
    escalationHistory: [
      { fromTier: 'AI_REP', toTier: 'AI_MANAGER', reason: 'Cancellation save flow triggered', timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
    ],
    messages: [],
    resolution: {
      type: 'ISSUE_RESOLVED',
      summary: 'Cancellation prevented with discount offer.',
      actionsTaken: ['Applied 20% retention discount', 'Extended subscription 1 month free'],
      followUpRequired: true,
      followUpDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
    },
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600000 + 25 * 60000).toISOString(),
    resolvedAt: new Date(Date.now() - 4 * 3600000 + 25 * 60000).toISOString(),
    customer: { id: 'cust_5', firstName: 'David', lastName: 'Wilson', email: 'david@example.com' },
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ConversationsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [sessions, setSessions] = useState<CSSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const companyId = selectedCompanyId || 'default';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { status?: CSSessionStatus; tier?: CSTier; channel?: string; limit?: number } = { limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter as CSSessionStatus;
      if (tierFilter !== 'all') params.tier = tierFilter as CSTier;
      if (channelFilter !== 'all') params.channel = channelFilter;

      const data = await csAiApi.getSessions(companyId, params).catch(() => ({ items: [], total: 0 }));

      if (data.items.length > 0) {
        setSessions(data.items);
      } else {
        setSessions(MOCK_SESSIONS);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSessions(MOCK_SESSIONS);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, statusFilter, tierFilter, channelFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter sessions by search
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.customer?.firstName?.toLowerCase().includes(query) ||
      session.customer?.lastName?.toLowerCase().includes(query) ||
      session.customer?.email?.toLowerCase().includes(query) ||
      session.issueCategory?.toLowerCase().includes(query) ||
      session.id.toLowerCase().includes(query)
    );
  });

  // Stats
  const activeCount = sessions.filter(s => s.status === 'ACTIVE').length;
  const escalatedCount = sessions.filter(s => s.status === 'ESCALATED').length;
  const resolvedCount = sessions.filter(s => s.status === 'RESOLVED').length;

  if (isLoading) {
    return (
      <>
        <Header title="Conversations" subtitle="CS AI chat sessions" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Conversations"
        subtitle="CS AI chat sessions and support tickets"
        actions={
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{escalatedCount}</p>
                <p className="text-xs text-muted-foreground">Escalated</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name, email, or issue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="ABANDONED">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="AI_REP">AI Rep</SelectItem>
                    <SelectItem value="AI_MANAGER">AI Manager</SelectItem>
                    <SelectItem value="HUMAN_AGENT">Human Agent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="voice">Voice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Conversations</CardTitle>
            <CardDescription>
              {filteredSessions.length} {filteredSessions.length === 1 ? 'conversation' : 'conversations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Customer</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Issue</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Channel</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Tier</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Sentiment</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Started</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="group hover:bg-muted/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {session.customer?.firstName} {session.customer?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{session.customer?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-sm capitalize">
                          {session.issueCategory?.toLowerCase().replace(/_/g, ' ') || 'General'}
                        </span>
                      </td>
                      <td className="py-3">
                        <ChannelBadge channel={session.channel} />
                      </td>
                      <td className="py-3">
                        <TierBadge tier={session.currentTier} />
                      </td>
                      <td className="py-3">
                        <SentimentIndicator sentiment={session.customerSentiment} />
                      </td>
                      <td className="py-3">
                        <SessionStatusBadge status={session.status} />
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(session.createdAt)}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link href={`/cs-ai/conversations/${session.id}`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border">
              {filteredSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/cs-ai/conversations/${session.id}`}
                  className="block py-4 active:bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">
                        {session.customer?.firstName} {session.customer?.lastName}
                      </span>
                    </div>
                    <SessionStatusBadge status={session.status} />
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <ChannelBadge channel={session.channel} />
                    <span className="text-muted-foreground">•</span>
                    <span className="capitalize text-muted-foreground">
                      {session.issueCategory?.toLowerCase().replace(/_/g, ' ') || 'General'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <TierBadge tier={session.currentTier} />
                      <SentimentIndicator sentiment={session.customerSentiment} />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(session.createdAt)}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredSessions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
