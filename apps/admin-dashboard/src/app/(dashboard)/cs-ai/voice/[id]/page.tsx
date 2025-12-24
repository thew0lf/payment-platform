'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Play,
  Pause,
  Download,
  Building2,
  User,
  DollarSign,
  MessageSquare,
  Bot,
  Brain,
  Headphones,
  ArrowRight,
  CircleDot,
  Target,
  Volume2,
  FileText,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { voiceAiApi, VoiceCall } from '@/lib/api/cs-ai';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CallFlowStep {
  id: string;
  type: 'initiation' | 'greeting' | 'diagnosis' | 'intervention' | 'resolution' | 'escalation' | 'end';
  title: string;
  description: string;
  timestamp: string;
  duration?: number;
  sentiment?: string;
  tier?: 'AI_REP' | 'AI_MANAGER' | 'HUMAN_AGENT';
  success?: boolean;
  details?: {
    intentsDetected?: string[];
    actionsOffered?: string[];
    customerResponse?: string;
    aiResponse?: string;
  };
}

interface ExtendedVoiceCall extends VoiceCall {
  clientId?: string;
  clientName?: string;
  companyName?: string;
  flowSteps?: CallFlowStep[];
  billingDetails?: {
    minutesUsed: number;
    ratePerMinute: number;
    totalCost: number;
    billable: boolean;
    breakdown?: {
      aiRepMinutes: number;
      aiManagerMinutes: number;
      humanAgentMinutes: number;
    };
  };
  transcriptSummary?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function CallDirectionIcon({ direction, size = 'md' }: { direction: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  if (direction === 'INBOUND') {
    return <PhoneIncoming className={cn(sizeClass, 'text-blue-400')} />;
  }
  return <PhoneOutgoing className={cn(sizeClass, 'text-green-400')} />;
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return null;

  const config: Record<string, { color: string; bg: string }> = {
    HAPPY: { color: 'text-green-400', bg: 'bg-green-500/10' },
    SATISFIED: { color: 'text-green-400', bg: 'bg-green-400/10' },
    NEUTRAL: { color: 'text-gray-400', bg: 'bg-gray-400/10' },
    FRUSTRATED: { color: 'text-amber-400', bg: 'bg-amber-400/10' },
    ANGRY: { color: 'text-orange-500', bg: 'bg-orange-500/10' },
    IRATE: { color: 'text-red-500', bg: 'bg-red-500/10' },
  };
  const c = config[sentiment] || config.NEUTRAL;

  return (
    <Badge variant="outline" className={cn('font-medium border-0', c.bg, c.color)}>
      {sentiment.charAt(0) + sentiment.slice(1).toLowerCase()}
    </Badge>
  );
}

function TierIcon({ tier }: { tier?: string }) {
  if (tier === 'AI_REP') return <Bot className="w-4 h-4 text-blue-400" />;
  if (tier === 'AI_MANAGER') return <Brain className="w-4 h-4 text-purple-400" />;
  if (tier === 'HUMAN_AGENT') return <Headphones className="w-4 h-4 text-green-400" />;
  return <Bot className="w-4 h-4 text-muted-foreground" />;
}

function FlowStepIcon({ type, success }: { type: string; success?: boolean }) {
  const iconClass = 'w-5 h-5';

  switch (type) {
    case 'initiation':
      return <Phone className={cn(iconClass, 'text-blue-400')} />;
    case 'greeting':
      return <MessageSquare className={cn(iconClass, 'text-green-400')} />;
    case 'diagnosis':
      return <Target className={cn(iconClass, 'text-amber-400')} />;
    case 'intervention':
      return <Brain className={cn(iconClass, 'text-purple-400')} />;
    case 'resolution':
      return <CheckCircle className={cn(iconClass, success ? 'text-green-400' : 'text-amber-400')} />;
    case 'escalation':
      return <AlertTriangle className={cn(iconClass, 'text-orange-400')} />;
    case 'end':
      return <CircleDot className={cn(iconClass, success ? 'text-green-400' : 'text-red-400')} />;
    default:
      return <CircleDot className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPhoneNumber(phone: string): string {
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
// CALL FLOW VISUALIZATION COMPONENT
// ═══════════════════════════════════════════════════════════════

function CallFlowVisualization({ steps }: { steps: CallFlowStep[] }) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  return (
    <div className="relative">
      {/* Vertical line connecting steps */}
      <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-border" />

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isExpanded = expandedStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Step connector dot */}
              <div className={cn(
                'absolute left-[19px] w-4 h-4 rounded-full border-2 bg-background z-10',
                step.success === true ? 'border-green-500' :
                step.success === false ? 'border-red-500' :
                step.type === 'escalation' ? 'border-orange-500' :
                'border-primary'
              )} />

              {/* Step content */}
              <div className={cn(
                'ml-12 rounded-lg border border-border p-4 transition-all',
                isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30',
                step.type === 'escalation' && 'border-orange-500/30 bg-orange-500/5',
                step.type === 'resolution' && step.success && 'border-green-500/30 bg-green-500/5'
              )}>
                {/* Step header */}
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FlowStepIcon type={step.type} success={step.success} />
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {step.tier && <TierIcon tier={step.tier} />}
                      {step.sentiment && <SentimentBadge sentiment={step.sentiment} />}
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                      {step.duration && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatDuration(step.duration)}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && step.details && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {step.details.intentsDetected && step.details.intentsDetected.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Detected Intents</p>
                        <div className="flex flex-wrap gap-1">
                          {step.details.intentsDetected.map((intent, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {intent.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {step.details.actionsOffered && step.details.actionsOffered.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Actions Offered</p>
                        <ul className="text-sm space-y-1">
                          {step.details.actionsOffered.map((action, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <ArrowRight className="w-3 h-3 text-primary" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {step.details.customerResponse && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Customer Response</p>
                        <p className="text-sm italic">"{step.details.customerResponse}"</p>
                      </div>
                    )}
                    {step.details.aiResponse && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">AI Response</p>
                        <p className="text-sm">{step.details.aiResponse}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function VoiceCallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params?.id as string;

  const [call, setCall] = useState<ExtendedVoiceCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadCall = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const callData = await voiceAiApi.getCall(callId);
      if (callData) {
        setCall(callData as ExtendedVoiceCall);
      } else {
        setError('Call not found');
        setCall(null);
      }
    } catch (err: any) {
      console.error('Failed to load call:', err);
      setError(err.message || 'Failed to load call details');
      setCall(null);
      toast.error('Failed to load call details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    loadCall();
  }, [loadCall]);

  if (isLoading) {
    return (
      <>
        <Header title="Call Details" subtitle="Loading..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!call) {
    return (
      <>
        <Header title="Call Not Found" subtitle="The requested call could not be found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={`Call ${call.id.slice(-8).toUpperCase()}`}
        subtitle={`${call.direction} call - ${new Date(call.initiatedAt).toLocaleString()}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Call Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CallDirectionIcon direction={call.direction} size="lg" />
                Call Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Direction</p>
                  <p className="font-medium">{call.direction}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={call.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {call.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Outcome</p>
                  <Badge variant={call.outcome === 'RESOLVED' ? 'default' : 'secondary'}>
                    {call.outcome || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-mono font-medium">{formatDuration(call.duration)}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <p className="font-mono">{formatPhoneNumber(call.fromNumber)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <p className="font-mono">{formatPhoneNumber(call.toNumber)}</p>
                </div>
              </div>

              {call.transcriptSummary && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Call Summary</p>
                  <p className="text-sm">{call.transcriptSummary}</p>
                </div>
              )}

              {/* Audio Player Placeholder */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-2 bg-primary rounded-full w-0" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0:00</span>
                      <span>{formatDuration(call.duration)}</span>
                    </div>
                  </div>
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side Info */}
          <div className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {call.customer?.firstName} {call.customer?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{call.customer?.email}</p>
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{call.clientName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">{call.companyName}</p>
                </div>
              </CardContent>
            </Card>

            {/* Billing Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Billing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Minutes Used</span>
                  <span className="font-medium">{call.billingDetails?.minutesUsed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rate/min</span>
                  <span className="font-medium">${call.billingDetails?.ratePerMinute.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium">Total Cost</span>
                  <span className="font-medium text-green-400">
                    ${call.billingDetails?.totalCost.toFixed(2)}
                  </span>
                </div>
                {call.billingDetails?.breakdown && (
                  <div className="pt-2 border-t border-border space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3" /> AI Rep
                      </span>
                      <span>{call.billingDetails.breakdown.aiRepMinutes.toFixed(2)} min</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" /> AI Manager
                      </span>
                      <span>{call.billingDetails.breakdown.aiManagerMinutes.toFixed(2)} min</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Headphones className="w-3 h-3" /> Human
                      </span>
                      <span>{call.billingDetails.breakdown.humanAgentMinutes.toFixed(2)} min</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detected Intents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Detected Intents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {call.detectedIntents.map((intent, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {intent.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sentiment */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Overall Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SentimentBadge sentiment={call.overallSentiment} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call Flow Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Call Flow
            </CardTitle>
            <CardDescription>
              Step-by-step breakdown of the call progression
            </CardDescription>
          </CardHeader>
          <CardContent>
            {call.flowSteps && call.flowSteps.length > 0 ? (
              <CallFlowVisualization steps={call.flowSteps} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No flow data available for this call</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
