'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';
import { Clock, Coffee, LogOut, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Session Timeout Configuration
 * SOC2 CC6.1 / ISO A.9.4.2 Compliant
 *
 * - Inactivity timeout: 15 minutes (900 seconds) - production
 * - Warning before timeout: 2 minutes (120 seconds)
 * - Activity events: mouse, keyboard, scroll, touch
 */
const SESSION_CONFIG = {
  // Total inactivity timeout in seconds (15 minutes for production, 30 min for dev)
  INACTIVITY_TIMEOUT: process.env.NODE_ENV === 'production' ? 900 : 1800,
  // Warning shown before logout (2 minutes)
  WARNING_BEFORE_TIMEOUT: 120,
  // Throttle activity detection (5 seconds)
  ACTIVITY_THROTTLE: 5000,
};

interface UseSessionTimeoutReturn {
  showWarning: boolean;
  timeRemaining: number;
  extendSession: () => void;
  logoutNow: () => void;
}

export function useSessionTimeout(): UseSessionTimeoutReturn {
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_CONFIG.WARNING_BEFORE_TIMEOUT);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimeouts = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const logoutNow = useCallback(async () => {
    clearAllTimeouts();
    setShowWarning(false);
    await logout();
  }, [clearAllTimeouts, logout]);

  const startCountdown = useCallback(() => {
    let remaining = SESSION_CONFIG.WARNING_BEFORE_TIMEOUT;
    setTimeRemaining(remaining);
    setShowWarning(true);

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        logoutNow();
      }
    }, 1000);
  }, [logoutNow]);

  const resetTimers = useCallback(() => {
    clearAllTimeouts();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    // Set warning timeout
    const warningTime = (SESSION_CONFIG.INACTIVITY_TIMEOUT - SESSION_CONFIG.WARNING_BEFORE_TIMEOUT) * 1000;
    warningTimeoutRef.current = setTimeout(() => {
      startCountdown();
    }, warningTime);

    // Set hard logout timeout (backup)
    logoutTimeoutRef.current = setTimeout(() => {
      logoutNow();
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT * 1000);
  }, [clearAllTimeouts, startCountdown, logoutNow]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Activity detection with throttling
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimeouts();
      return;
    }

    let lastThrottleTime = 0;

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastThrottleTime >= SESSION_CONFIG.ACTIVITY_THROTTLE) {
        lastThrottleTime = now;
        if (!showWarning) {
          resetTimers();
        }
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimeouts();
    };
  }, [isAuthenticated, showWarning, resetTimers, clearAllTimeouts]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    logoutNow,
  };
}

/**
 * Session Timeout Modal Component
 * SOC2/ISO compliant "Are you still there?" modal
 */
interface SessionTimeoutModalProps {
  showWarning: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  showWarning,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !showWarning) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = timeRemaining <= 30;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className={`p-4 ${isUrgent ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10' : 'bg-gradient-to-r from-violet-500/10 to-purple-500/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-500/20' : 'bg-violet-500/20'}`}>
              {isUrgent ? (
                <Zap className="w-6 h-6 text-red-500 animate-pulse" />
              ) : (
                <Coffee className="w-6 h-6 text-violet-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isUrgent ? 'Hey! Wake up! ' : 'Still there? '}
                <span role="img" aria-label="wave">👋</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {isUrgent ? "Quick, your session is about to peace out!" : "Looks like you took a little break"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-muted-foreground mb-4">
            {isUrgent
              ? "We're about to log you out for security (very Mission Impossible, we know). Click below to stay in the action!"
              : "Your session decided to start a countdown without telling you. Rude, right? 😏 But don't worry—just click to keep the party going!"
            }
          </p>

          {/* Countdown */}
          <div className={`flex items-center justify-center gap-3 p-4 rounded-xl mb-6 ${
            isUrgent ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20' : 'bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20'
          }`}>
            <Clock className={`w-6 h-6 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-violet-500'}`} />
            <div className="text-center">
              <div className={`text-3xl font-mono font-bold ${isUrgent ? 'text-red-500' : 'text-foreground'}`}>
                {timeString}
              </div>
              <p className="text-xs text-muted-foreground">
                {isUrgent ? "⚡ Hurry up!" : "Time remaining"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onExtend}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              I'm Back! ✨
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Me Out
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-center text-muted-foreground">
              <span role="img" aria-label="shield">🛡️</span> <strong>Security heads up:</strong> Sessions timeout after {SESSION_CONFIG.INACTIVITY_TIMEOUT / 60} minutes of inactivity to keep your account safe. We've got your back!
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Session Timeout Provider Component
 * Wrap your authenticated layout with this to enable session timeout
 */
export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { showWarning, timeRemaining, extendSession, logoutNow } = useSessionTimeout();

  return (
    <>
      {children}
      <SessionTimeoutModal
        showWarning={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={logoutNow}
      />
    </>
  );
}
