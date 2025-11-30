'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Monitor, Smartphone, Globe, MapPin, Clock, LogOut, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSessions } from '@/hooks/use-rbac';
import { UserSession } from '@/lib/api/rbac';

interface SessionManagerProps {
  currentSessionToken?: string;
}

export function SessionManager({ currentSessionToken }: SessionManagerProps) {
  const { sessions, isLoading, error, revokeSession, revokeAllSessions, refresh } = useSessions();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await revokeSession(sessionId);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevoking('all');
    try {
      await revokeAllSessions(true);
      setShowRevokeAll(false);
    } finally {
      setRevoking(null);
    }
  };

  const parseUserAgent = (ua?: string): { device: string; browser: string } => {
    if (!ua) return { device: 'Unknown', browser: 'Unknown' };

    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet/i.test(ua)) device = 'Tablet';

    let browser = 'Unknown';
    if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';

    return { device, browser };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 bg-zinc-800/50 rounded-lg animate-pulse border border-zinc-700/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={refresh} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Active Sessions</h3>
          <p className="text-sm text-zinc-400">
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRevokeAll(true)}
            disabled={revoking !== null}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out All Others
          </Button>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const isCurrent = session.sessionToken === currentSessionToken;
          const { device, browser } = parseUserAgent(session.userAgent);
          const isRevoking = revoking === session.id;

          return (
            <div
              key={session.id}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                isCurrent
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-zinc-800/50 border-zinc-700/50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Device icon */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isCurrent ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-700/50 text-zinc-400'
                    )}
                  >
                    {device === 'Mobile' ? (
                      <Smartphone className="h-5 w-5" />
                    ) : (
                      <Monitor className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    {/* Browser & Device */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-100">
                        {browser} on {device}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          Current
                        </Badge>
                      )}
                    </div>

                    {/* Location */}
                    {(session.city || session.country) && (
                      <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {[session.city, session.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* IP Address */}
                    {session.ipAddress && (
                      <div className="flex items-center gap-1 text-sm text-zinc-500 mt-0.5">
                        <Globe className="h-3.5 w-3.5" />
                        <span>{session.ipAddress}</span>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active{' '}
                        {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                      </span>
                      <span>
                        Signed in{' '}
                        {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Revoke button */}
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={isRevoking}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    {isRevoking ? (
                      <span className="animate-spin">...</span>
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-zinc-500">No active sessions found</div>
      )}

      {/* Revoke All Dialog */}
      <AlertDialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of all devices except this one. You'll need to sign in again
              on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              className="bg-red-600 hover:bg-red-700"
              disabled={revoking === 'all'}
            >
              {revoking === 'all' ? 'Signing out...' : 'Sign Out All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
