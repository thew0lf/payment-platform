'use client';

import { useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface UrgencyConfig {
  enabled: boolean;
  type: 'countdown' | 'limited_time' | 'ending_soon';
  duration: number; // seconds
  message: string;
  expiredMessage?: string;
  showOnStages: string[];
  position: 'banner' | 'inline' | 'floating';
  style: 'warning' | 'info' | 'danger';
}

interface UrgencyTimerProps {
  config: UrgencyConfig;
  currentStage: string;
  sessionToken?: string;
  onExpired?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function UrgencyTimer({ config, currentStage, sessionToken, onExpired }: UrgencyTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Initialize timer from session storage to persist across page loads
  useEffect(() => {
    if (!config.enabled) return;

    const storageKey = `urgency_timer_${sessionToken || 'default'}`;
    const storedEndTime = localStorage.getItem(storageKey);

    let endTime: number;
    if (storedEndTime) {
      endTime = parseInt(storedEndTime, 10);
    } else {
      endTime = Date.now() + config.duration * 1000;
      localStorage.setItem(storageKey, endTime.toString());
    }

    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    setTimeRemaining(remaining);

    if (remaining === 0) {
      setIsExpired(true);
      onExpired?.();
    }
  }, [config.enabled, config.duration, sessionToken, onExpired]);

  // Countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsExpired(true);
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onExpired]);

  // Check if should show on current stage
  const shouldShowOnStage = config.showOnStages.includes(currentStage);

  if (!config.enabled || !shouldShowOnStage || timeRemaining === null) return null;

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Style classes based on config
  const styleClasses = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };

  const iconClasses = {
    warning: 'text-amber-500',
    info: 'text-blue-500',
    danger: 'text-red-500',
  };

  const timerClasses = {
    warning: 'bg-amber-100 text-amber-900',
    info: 'bg-blue-100 text-blue-900',
    danger: 'bg-red-100 text-red-900',
  };

  // Banner position
  if (config.position === 'banner') {
    return (
      <div
        className={`w-full border-b ${styleClasses[config.style]} py-3 px-4 ${
          isExpired ? 'opacity-75' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          {/* Clock Icon */}
          <svg
            className={`w-5 h-5 ${iconClasses[config.style]} ${!isExpired ? 'animate-pulse' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          {/* Message */}
          <span className="font-medium">
            {isExpired ? config.expiredMessage || 'Offer expired' : config.message}
          </span>

          {/* Timer */}
          {!isExpired && (
            <div className={`px-3 py-1 rounded-full font-mono font-bold ${timerClasses[config.style]}`}>
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline position
  if (config.position === 'inline') {
    return (
      <div
        className={`border rounded-lg ${styleClasses[config.style]} py-2 px-4 flex items-center gap-2 ${
          isExpired ? 'opacity-75' : ''
        }`}
      >
        <svg
          className={`w-4 h-4 ${iconClasses[config.style]} ${!isExpired ? 'animate-pulse' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium">
          {isExpired ? config.expiredMessage || 'Offer expired' : config.message}
        </span>
        {!isExpired && (
          <span className={`text-sm font-mono font-bold ${timerClasses[config.style]} px-2 py-0.5 rounded`}>
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>
    );
  }

  // Floating position
  return (
    <div
      className={`fixed bottom-4 right-4 z-40 border rounded-lg shadow-lg ${
        styleClasses[config.style]
      } py-3 px-4 ${isExpired ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center gap-3">
        <svg
          className={`w-5 h-5 ${iconClasses[config.style]} ${!isExpired ? 'animate-pulse' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium">
            {isExpired ? config.expiredMessage || 'Offer expired' : config.message}
          </p>
          {!isExpired && (
            <p className={`text-lg font-mono font-bold mt-1`}>{formatTime(timeRemaining)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UrgencyTimer;
