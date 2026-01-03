'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UrgencyTimerProps {
  /** Duration in seconds (default: 900 = 15 minutes) */
  duration?: number;
  /** Callback when timer expires */
  onExpire?: () => void;
  /** Display variant */
  variant?: 'banner' | 'inline' | 'floating';
  /** Show clock icon (default: true) */
  showIcon?: boolean;
  /** Storage key suffix for sessionStorage persistence */
  storageKey?: string;
}

type TimerState = 'normal' | 'warning' | 'critical';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const WARNING_THRESHOLD = 300; // 5 minutes
const CRITICAL_THRESHOLD = 120; // 2 minutes
const STORAGE_KEY_PREFIX = 'urgency_timer_end_';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format seconds into MM:SS or HH:MM:SS display
 */
function formatTime(seconds: number): string {
  if (seconds < 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get timer state based on remaining seconds
 */
function getTimerState(seconds: number): TimerState {
  if (seconds <= CRITICAL_THRESHOLD) return 'critical';
  if (seconds <= WARNING_THRESHOLD) return 'warning';
  return 'normal';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOCK ICON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function UrgencyTimer({
  duration = 900,
  onExpire,
  variant = 'banner',
  showIcon = true,
  storageKey = 'default',
}: UrgencyTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [hasAnnounced, setHasAnnounced] = useState<{ warning: boolean; critical: boolean }>({
    warning: false,
    critical: false,
  });
  const announcementRef = useRef<HTMLDivElement>(null);
  const onExpireRef = useRef(onExpire);

  // Keep onExpire ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Initialize timer from sessionStorage to persist across page reloads
  useEffect(() => {
    const fullStorageKey = `${STORAGE_KEY_PREFIX}${storageKey}`;

    try {
      const storedEndTime = sessionStorage.getItem(fullStorageKey);
      let endTime: number;

      if (storedEndTime) {
        endTime = parseInt(storedEndTime, 10);
      } else {
        endTime = Date.now() + duration * 1000;
        sessionStorage.setItem(fullStorageKey, endTime.toString());
      }

      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setIsExpired(true);
        onExpireRef.current?.();
      }
    } catch {
      // SessionStorage not available (SSR or privacy mode)
      setTimeRemaining(duration);
    }
  }, [duration, storageKey]);

  // Countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsExpired(true);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Announce state changes for screen readers
  const announceStateChange = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
    }
  }, []);

  useEffect(() => {
    if (timeRemaining === null) return;

    const state = getTimerState(timeRemaining);

    if (state === 'warning' && !hasAnnounced.warning) {
      announceStateChange('Warning: Less than 5 minutes remaining to complete your order.');
      setHasAnnounced((prev) => ({ ...prev, warning: true }));
    } else if (state === 'critical' && !hasAnnounced.critical) {
      announceStateChange('Heads up! Only 2 minutes left to lock in your items. Finish up now!');
      setHasAnnounced((prev) => ({ ...prev, critical: true }));
    }
  }, [timeRemaining, hasAnnounced, announceStateChange]);

  // Don't render until we have the time
  if (timeRemaining === null) return null;

  const state = getTimerState(timeRemaining);
  const formattedTime = formatTime(timeRemaining);

  // Style classes based on state
  const stateStyles = {
    normal: {
      container: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200',
      icon: 'text-gray-500 dark:text-gray-400',
      timer: 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200',
      icon: 'text-amber-500 dark:text-amber-400',
      timer: 'bg-amber-100 text-amber-900 dark:bg-amber-800/50 dark:text-amber-100',
    },
    critical: {
      container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
      icon: 'text-red-500 dark:text-red-400',
      timer: 'bg-red-100 text-red-900 dark:bg-red-800/50 dark:text-red-100',
    },
  };

  const currentStyles = stateStyles[state];
  const shouldPulse = state === 'critical' && !isExpired;

  // Base container for screen reader announcements
  const screenReaderAnnouncement = (
    <div
      ref={announcementRef}
      className="sr-only"
      aria-live="polite"
      role="status"
    />
  );

  // Banner variant - full width at top
  if (variant === 'banner') {
    return (
      <>
        {screenReaderAnnouncement}
        <div
          role="timer"
          aria-label={`Cart reservation timer: ${formattedTime} remaining`}
          className={`
            w-full border-b py-3 px-4
            ${currentStyles.container}
            ${isExpired ? 'opacity-75' : ''}
            motion-safe:transition-colors motion-safe:duration-300
          `}
          style={{ '--primary-color': 'var(--brand-primary, #3b82f6)' } as React.CSSProperties}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            {showIcon && (
              <ClockIcon
                className={`
                  w-5 h-5 flex-shrink-0
                  ${currentStyles.icon}
                  ${shouldPulse ? 'motion-safe:animate-pulse' : ''}
                `}
              />
            )}

            <span className="font-medium text-sm sm:text-base">
              {isExpired ? 'Your cart reservation has expired' : 'Your items are reserved for:'}
            </span>

            {!isExpired && (
              <div
                className={`
                  px-3 py-1 rounded-full font-mono font-bold text-sm sm:text-base
                  ${currentStyles.timer}
                  ${shouldPulse ? 'motion-safe:animate-pulse' : ''}
                `}
                aria-hidden="true"
              >
                {formattedTime}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Inline variant - compact display
  if (variant === 'inline') {
    return (
      <>
        {screenReaderAnnouncement}
        <div
          role="timer"
          aria-label={`Cart reservation timer: ${formattedTime} remaining`}
          className={`
            inline-flex items-center gap-2 border rounded-lg py-2 px-3
            ${currentStyles.container}
            ${isExpired ? 'opacity-75' : ''}
            motion-safe:transition-colors motion-safe:duration-300
          `}
          style={{ '--primary-color': 'var(--brand-primary, #3b82f6)' } as React.CSSProperties}
        >
          {showIcon && (
            <ClockIcon
              className={`
                w-4 h-4 flex-shrink-0
                ${currentStyles.icon}
                ${shouldPulse ? 'motion-safe:animate-pulse' : ''}
              `}
            />
          )}

          <span className="text-sm font-medium">
            {isExpired ? 'Expired' : 'Yours for:'}
          </span>

          {!isExpired && (
            <span
              className={`
                text-sm font-mono font-bold px-2 py-0.5 rounded
                ${currentStyles.timer}
                ${shouldPulse ? 'motion-safe:animate-pulse' : ''}
              `}
              aria-hidden="true"
            >
              {formattedTime}
            </span>
          )}
        </div>
      </>
    );
  }

  // Floating variant - fixed position badge in corner
  return (
    <>
      {screenReaderAnnouncement}
      <div
        role="timer"
        aria-label={`Cart reservation timer: ${formattedTime} remaining`}
        className={`
          fixed bottom-4 right-4 z-40
          border rounded-lg shadow-lg
          py-3 px-4
          min-w-[44px] min-h-[44px]
          ${currentStyles.container}
          ${isExpired ? 'opacity-75' : ''}
          motion-safe:transition-all motion-safe:duration-300
          ${shouldPulse ? 'motion-safe:animate-pulse' : ''}
        `}
        style={{ '--primary-color': 'var(--brand-primary, #3b82f6)' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          {showIcon && (
            <ClockIcon
              className={`
                w-5 h-5 flex-shrink-0
                ${currentStyles.icon}
              `}
            />
          )}

          <div>
            <p className="text-xs font-medium opacity-75">
              {isExpired ? 'Reservation expired' : 'Cart reserved'}
            </p>
            {!isExpired && (
              <p
                className="text-lg font-mono font-bold"
                aria-hidden="true"
              >
                {formattedTime}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default UrgencyTimer;
