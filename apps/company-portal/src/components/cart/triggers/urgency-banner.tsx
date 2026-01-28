'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface TimeLeft {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export type UrgencyType = 'countdown' | 'stock' | 'demand';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

interface UrgencyBannerProps {
  /** Type of urgency display */
  type?: UrgencyType;
  /** Custom message - use {time} placeholder for countdown, {stock} for stock count */
  message?: string;
  /** End time for countdown type (also accepts expiresAt for backward compatibility) */
  endTime?: Date;
  /** @deprecated Use endTime instead */
  expiresAt?: Date;
  /** Stock remaining for stock type */
  stockRemaining?: number;
  /** Override urgency level styling */
  urgencyLevel?: UrgencyLevel;
  /** Callback when countdown expires */
  onExpire?: () => void;
}

function calculateTimeLeft(endTime: Date): TimeLeft {
  const total = endTime.getTime() - Date.now();
  return {
    total,
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function getUrgencyLevelFromTime(ms: number): UrgencyLevel {
  if (ms < 5 * 60 * 1000) return 'critical'; // < 5 min
  if (ms < 15 * 60 * 1000) return 'high'; // < 15 min
  if (ms < 60 * 60 * 1000) return 'medium'; // < 1 hour
  return 'low';
}

function getUrgencyLevelFromStock(stock: number): UrgencyLevel {
  if (stock <= 2) return 'critical';
  if (stock <= 5) return 'high';
  if (stock <= 10) return 'medium';
  return 'low';
}

function formatTimeLeft(time: TimeLeft): string {
  const parts: string[] = [];
  if (time.hours > 0) {
    parts.push(`${time.hours}h`);
  }
  parts.push(`${time.minutes.toString().padStart(2, '0')}m`);
  parts.push(`${time.seconds.toString().padStart(2, '0')}s`);
  return parts.join(':');
}

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  critical: 'bg-red-500 text-white animate-pulse',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-yellow-900',
  low: 'bg-blue-100 text-blue-800',
};

const URGENCY_ICONS: Record<UrgencyType, typeof Clock> = {
  countdown: Clock,
  stock: AlertTriangle,
  demand: TrendingUp,
};

const DEFAULT_MESSAGES: Record<UrgencyType, string> = {
  countdown: 'Your reserved items expire in {time}',
  stock: 'Only {stock} left in stock!',
  demand: 'High demand - selling fast!',
};

export function UrgencyBanner({
  type = 'countdown',
  message,
  endTime,
  expiresAt,
  stockRemaining,
  urgencyLevel: forcedLevel,
  onExpire,
}: UrgencyBannerProps) {
  // Support both endTime and expiresAt for backward compatibility
  const targetTime = endTime || expiresAt;

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(
    targetTime ? calculateTimeLeft(targetTime) : { total: 0, hours: 0, minutes: 0, seconds: 0 }
  );

  const handleExpire = useCallback(() => {
    onExpire?.();
  }, [onExpire]);

  // Countdown timer effect
  useEffect(() => {
    if (type !== 'countdown' || !targetTime) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(targetTime);
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        clearInterval(timer);
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [type, targetTime, handleExpire]);

  // Determine urgency level
  const computedLevel = (() => {
    if (forcedLevel) return forcedLevel;
    if (type === 'countdown' && timeLeft.total > 0) {
      return getUrgencyLevelFromTime(timeLeft.total);
    }
    if (type === 'stock' && stockRemaining !== undefined) {
      return getUrgencyLevelFromStock(stockRemaining);
    }
    return 'medium';
  })();

  // Don't render if countdown expired
  if (type === 'countdown' && timeLeft.total <= 0) return null;

  // Don't render stock urgency if plenty in stock
  if (type === 'stock' && (stockRemaining === undefined || stockRemaining > 20)) return null;

  const Icon = URGENCY_ICONS[type];
  const displayMessage = message || DEFAULT_MESSAGES[type];

  // Replace placeholders
  const formattedMessage = displayMessage
    .replace('{time}', formatTimeLeft(timeLeft))
    .replace('{stock}', String(stockRemaining || 0));

  return (
    <div
      className={`
        flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
        ${URGENCY_STYLES[computedLevel]}
      `}
      role={type === 'countdown' ? 'timer' : 'status'}
      aria-live="polite"
      aria-label={formattedMessage}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>
        {type === 'countdown' ? (
          <>
            {displayMessage.split('{time}')[0]}
            <span className="font-mono font-bold">{formatTimeLeft(timeLeft)}</span>
            {displayMessage.split('{time}')[1] || ''}
          </>
        ) : (
          formattedMessage
        )}
      </span>
    </div>
  );
}
