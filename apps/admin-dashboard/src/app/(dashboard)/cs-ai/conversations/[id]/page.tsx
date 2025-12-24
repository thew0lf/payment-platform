'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MessageSquare,
  Bot,
  Brain,
  Headphones,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Send,
  ChevronRight,
  Building2,
  Target,
  TrendingUp,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { csAiApi, CSSession, CSMessage, CSTier, CustomerSentiment } from '@/lib/api/cs-ai';

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

function SentimentBadge({ sentiment }: { sentiment: CustomerSentiment }) {
  const config: Record<CustomerSentiment, { color: string; bg: string; label: string }> = {
    HAPPY: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Happy' },
    SATISFIED: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Satisfied' },
    NEUTRAL: { color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Neutral' },
    FRUSTRATED: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Frustrated' },
    ANGRY: { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Angry' },
    IRATE: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Irate' },
  };
  const c = config[sentiment] || config.NEUTRAL;

  return (
    <Badge variant="outline" className={cn('font-medium border-0', c.bg, c.color)}>
      {c.label}
    </Badge>
  );
}

function MessageBubble({ message }: { message: CSMessage }) {
  const isCustomer = message.role === 'customer';
  const isSystem = message.role === 'system';

  const getRoleIcon = () => {
    switch (message.role) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'ai_rep':
        return <Bot className="w-4 h-4" />;
      case 'ai_manager':
        return <Brain className="w-4 h-4" />;
      case 'human_agent':
        return <Headphones className="w-4 h-4" />;
      case 'system':
        return <Info className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getRoleLabel = () => {
    switch (message.role) {
      case 'customer':
        return 'Customer';
      case 'ai_rep':
        return 'AI Rep';
      case 'ai_manager':
        return 'AI Manager';
      case 'human_agent':
        return 'Agent';
      case 'system':
        return 'System';
      default:
        return message.role;
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center gap-1">
          <Info className="w-3 h-3" />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3 mb-4', isCustomer ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isCustomer ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        {getRoleIcon()}
      </div>
      <div className={cn('max-w-[70%]', isCustomer ? 'items-end' : 'items-start')}>
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isCustomer ? 'flex-row-reverse' : 'flex-row'
        )}>
          <span className="text-xs font-medium">{getRoleLabel()}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.sentiment && <SentimentBadge sentiment={message.sentiment} />}
        </div>
        <div className={cn(
          'rounded-lg px-4 py-2',
          isCustomer
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.metadata.suggestedActions.map((action, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {action}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EscalationTimeline({ escalationHistory }: { escalationHistory: CSSession['escalationHistory'] }) {
  if (!escalationHistory || escalationHistory.length === 0) return null;

  return (
    <div className="space-y-3">
      {escalationHistory.map((escalation, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
          </div>
          <div>
            <p className="text-sm">
              <span className="font-medium">
                {escalation.fromTier.replace('_', ' ')} → {escalation.toTier.replace('_', ' ')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{escalation.reason}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(escalation.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<CSSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await csAiApi.getSession(sessionId);
      if (data) {
        setSession(data);
      } else {
        setError('Session not found');
        setSession(null);
      }
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.message || 'Failed to load session');
      setSession(null);
      toast.error('Failed to load session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    setIsSending(true);
    try {
      const response = await csAiApi.sendMessage(session.id, newMessage);
      if (response) {
        setSession(response.session);
      }
      setNewMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Conversation" subtitle="Loading..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Header title="Conversation Not Found" subtitle="The requested conversation could not be found" />
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
        title={`${session.customer?.firstName} ${session.customer?.lastName}`}
        subtitle={`${session.issueCategory?.replace(/_/g, ' ') || 'General'} - ${session.channel}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Chat Area */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TierBadge tier={session.currentTier} />
                    <Badge variant={session.status === 'ACTIVE' ? 'default' : session.status === 'ESCALATED' ? 'destructive' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                  <SentimentBadge sentiment={session.customerSentiment} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                {session.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
              {session.status !== 'RESOLVED' && session.status !== 'ABANDONED' && (
                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message... (simulated)"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={isSending}
                    />
                    <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
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
                  {session.customer?.firstName} {session.customer?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{session.customer?.email}</p>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span className="capitalize">{session.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue</span>
                  <span className="capitalize">{session.issueCategory?.toLowerCase().replace(/_/g, ' ') || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span>{session.messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment History */}
            {session.sentimentHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Sentiment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {session.sentimentHistory.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <SentimentBadge sentiment={entry.sentiment} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Escalation History */}
            {session.escalationHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Escalation History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EscalationTimeline escalationHistory={session.escalationHistory} />
                </CardContent>
              </Card>
            )}

            {/* Resolution */}
            {session.resolution && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Resolution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Badge variant="default">{session.resolution.type.replace(/_/g, ' ')}</Badge>
                  <p className="text-muted-foreground">{session.resolution.summary}</p>
                  {session.resolution.actionsTaken.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Actions Taken</p>
                      <ul className="space-y-1">
                        {session.resolution.actionsTaken.map((action, i) => (
                          <li key={i} className="flex items-center gap-1 text-xs">
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
