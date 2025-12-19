'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  ChevronRight,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
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
import { voiceAiApi, VoiceCall } from '@/lib/api/cs-ai';

// ═══════════════════════════════════════════════════════════════
// TYPES - Extended for billing tracking
// ═══════════════════════════════════════════════════════════════

interface ExtendedVoiceCall extends VoiceCall {
  clientId?: string;
  clientName?: string;
  companyName?: string;
  billingDetails?: {
    minutesUsed: number;
    ratePerMinute: number;
    totalCost: number;
    billable: boolean;
  };
}

interface CallStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  avgDuration: number;
  successRate: number;
  totalMinutes: number;
  estimatedRevenue: number;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function CallDirectionIcon({ direction }: { direction: string }) {
  if (direction === 'INBOUND') {
    return <PhoneIncoming className="w-4 h-4 text-blue-400" />;
  }
  return <PhoneOutgoing className="w-4 h-4 text-green-400" />;
}

function CallStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    COMPLETED: { label: 'Completed', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Phone },
    FAILED: { label: 'Failed', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
    NO_ANSWER: { label: 'No Answer', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: PhoneMissed },
    BUSY: { label: 'Busy', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertTriangle },
    QUEUED: { label: 'Queued', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Clock },
    RINGING: { label: 'Ringing', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Phone },
  };
  const c = config[status] || config.QUEUED;
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={cn('font-medium', c.color)}>
      <Icon className="w-3 h-3 mr-1" />
      {c.label}
    </Badge>
  );
}

function CallOutcomeBadge({ outcome }: { outcome?: string }) {
  if (!outcome) return null;

  const config: Record<string, { label: string; color: string }> = {
    RESOLVED: { label: 'Resolved', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    ESCALATED: { label: 'Escalated', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    CALLBACK_SCHEDULED: { label: 'Callback', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    TRANSFERRED: { label: 'Transferred', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    VOICEMAIL: { label: 'Voicemail', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    CUSTOMER_HANGUP: { label: 'Customer Hangup', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    SAVE_SUCCESSFUL: { label: 'Save Success', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    SAVE_FAILED: { label: 'Save Failed', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const c = config[outcome] || { label: outcome, color: 'bg-muted text-muted-foreground border-border' };

  return (
    <Badge variant="outline" className={cn('font-medium', c.color)}>
      {c.label}
    </Badge>
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPhoneNumber(phone: string): string {
  // Format as (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}


// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function VoiceAIPage() {
  const { selectedCompanyId } = useHierarchy();
  const [calls, setCalls] = useState<ExtendedVoiceCall[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const companyId = selectedCompanyId || 'default';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const callsData = await voiceAiApi.getCalls(companyId, { limit: 50 }).catch((err) => {
        console.error('Failed to load voice calls:', err);
        return null;
      });

      if (callsData && callsData.length > 0) {
        setCalls(callsData as ExtendedVoiceCall[]);
        // Calculate stats from real data
        const completed = callsData.filter(c => c.status === 'COMPLETED');
        setStats({
          totalCalls: callsData.length,
          inboundCalls: callsData.filter(c => c.direction === 'INBOUND').length,
          outboundCalls: callsData.filter(c => c.direction === 'OUTBOUND').length,
          avgDuration: completed.length > 0
            ? Math.round(completed.reduce((sum, c) => sum + (c.duration || 0), 0) / completed.length)
            : 0,
          successRate: callsData.length > 0
            ? Math.round((completed.length / callsData.length) * 100)
            : 0,
          totalMinutes: Math.round(callsData.reduce((sum, c) => sum + (c.duration || 0), 0) / 60),
          estimatedRevenue: callsData.reduce((sum, c) => sum + (c.duration || 0), 0) / 60 * 0.15,
        });
      } else {
        // No data available - show empty state
        setCalls([]);
        setStats({
          totalCalls: 0,
          inboundCalls: 0,
          outboundCalls: 0,
          avgDuration: 0,
          successRate: 0,
          totalMinutes: 0,
          estimatedRevenue: 0,
        });
      }
    } catch (err) {
      console.error('Failed to load voice calls:', err);
      setCalls([]);
      setStats({
        totalCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        avgDuration: 0,
        successRate: 0,
        totalMinutes: 0,
        estimatedRevenue: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter calls
  const filteredCalls = calls.filter(call => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        call.fromNumber.toLowerCase().includes(query) ||
        call.toNumber.toLowerCase().includes(query) ||
        call.customer?.firstName?.toLowerCase().includes(query) ||
        call.customer?.lastName?.toLowerCase().includes(query) ||
        call.customer?.email?.toLowerCase().includes(query) ||
        call.clientName?.toLowerCase().includes(query) ||
        call.companyName?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (statusFilter !== 'all' && call.status !== statusFilter) return false;
    if (directionFilter !== 'all' && call.direction !== directionFilter) return false;
    if (outcomeFilter !== 'all' && call.outcome !== outcomeFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <>
        <Header title="Voice AI Calls" subtitle="Call management and tracking" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Voice AI Calls"
        subtitle="Call management, tracking, and billing"
        actions={
          <div className="flex items-center gap-2">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats?.totalCalls}</p>
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <PhoneIncoming className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats?.inboundCalls}</p>
                  <p className="text-xs text-muted-foreground">Inbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <PhoneOutgoing className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats?.outboundCalls}</p>
                  <p className="text-xs text-muted-foreground">Outbound</p>
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
                  <p className="text-2xl font-semibold">{formatDuration(stats?.avgDuration)}</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats?.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats?.totalMinutes}</p>
                  <p className="text-xs text-muted-foreground">Total Minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">${stats?.estimatedRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Est. Revenue</p>
                </div>
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
                    placeholder="Search by phone, customer, client, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Directions</SelectItem>
                    <SelectItem value="INBOUND">Inbound</SelectItem>
                    <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="NO_ANSWER">No Answer</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                    <SelectItem value="SAVE_SUCCESSFUL">Save Success</SelectItem>
                    <SelectItem value="SAVE_FAILED">Save Failed</SelectItem>
                    <SelectItem value="CALLBACK_SCHEDULED">Callback</SelectItem>
                    <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call History</CardTitle>
            <CardDescription>
              {filteredCalls.length} {filteredCalls.length === 1 ? 'call' : 'calls'} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Direction</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Customer</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Phone</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Client / Company</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Outcome</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Duration</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Cost</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Time</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="group hover:bg-muted/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <CallDirectionIcon direction={call.direction} />
                          <span className="text-sm">{call.direction === 'INBOUND' ? 'In' : 'Out'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-sm">
                            {call.customer?.firstName} {call.customer?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{call.customer?.email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-sm font-mono">
                          {formatPhoneNumber(call.direction === 'INBOUND' ? call.fromNumber : call.toNumber)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{call.clientName || '-'}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground">{call.companyName || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <CallStatusBadge status={call.status} />
                      </td>
                      <td className="py-3">
                        <CallOutcomeBadge outcome={call.outcome} />
                      </td>
                      <td className="py-3">
                        <span className="text-sm font-mono">{formatDuration(call.duration)}</span>
                      </td>
                      <td className="py-3">
                        {call.billingDetails?.billable ? (
                          <span className="text-sm font-medium text-green-400">
                            ${call.billingDetails.totalCost.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(call.initiatedAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link href={`/cs-ai/voice/${call.id}`}>
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
              {filteredCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/cs-ai/voice/${call.id}`}
                  className="block py-4 active:bg-muted/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CallDirectionIcon direction={call.direction} />
                      <span className="font-medium">
                        {call.customer?.firstName} {call.customer?.lastName}
                      </span>
                    </div>
                    <CallStatusBadge status={call.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-mono">
                      {formatPhoneNumber(call.direction === 'INBOUND' ? call.fromNumber : call.toNumber)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span>{call.clientName || 'N/A'}</span>
                      <CallOutcomeBadge outcome={call.outcome} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{formatDuration(call.duration)}</span>
                      {call.billingDetails?.billable && (
                        <span className="text-green-400">${call.billingDetails.totalCost.toFixed(2)}</span>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredCalls.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No calls found matching your criteria</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
