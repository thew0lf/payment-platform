'use client';

import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ScarcityConfig {
  enabled: boolean;
  type: 'stock' | 'spots' | 'availability';
  threshold: number;
  message: string;
  showOnStages: string[];
  animate: boolean;
}

interface ScarcityIndicatorProps {
  config: ScarcityConfig;
  currentStage: string;
  productName?: string;
  customCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ScarcityIndicator({
  config,
  currentStage,
  productName,
  customCount,
}: ScarcityIndicatorProps) {
  const [displayCount, setDisplayCount] = useState(customCount ?? config.threshold);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if should show on current stage
  const shouldShowOnStage = config.showOnStages.includes(currentStage);

  // Occasionally decrement count for psychological effect
  useEffect(() => {
    if (!config.enabled || !config.animate || !shouldShowOnStage) return;

    const decrementChance = () => {
      // 10% chance to decrement every 30-60 seconds
      if (Math.random() < 0.1 && displayCount > 1) {
        setIsAnimating(true);
        setTimeout(() => {
          setDisplayCount((prev) => Math.max(1, prev - 1));
          setIsAnimating(false);
        }, 300);
      }
    };

    const interval = setInterval(decrementChance, 30000 + Math.random() * 30000);
    return () => clearInterval(interval);
  }, [config.enabled, config.animate, shouldShowOnStage, displayCount]);

  if (!config.enabled || !shouldShowOnStage) return null;

  // Parse message with count placeholder
  const formattedMessage = config.message.replace('{count}', displayCount.toString());

  // Get icon based on type
  const getIcon = () => {
    switch (config.type) {
      case 'stock':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        );
      case 'spots':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case 'availability':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // Determine urgency level for styling
  const getUrgencyLevel = () => {
    if (displayCount <= 3) return 'critical';
    if (displayCount <= 5) return 'high';
    if (displayCount <= 10) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();

  const urgencyStyles = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
      badge: 'bg-red-100 text-red-800',
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: 'text-orange-500',
      badge: 'bg-orange-100 text-orange-800',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-800',
    },
    low: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800',
    },
  };

  const styles = urgencyStyles[urgencyLevel];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${styles.bg} ${
        styles.border
      } ${styles.text} ${isAnimating ? 'animate-pulse' : ''}`}
    >
      {/* Icon */}
      <span className={styles.icon}>{getIcon()}</span>

      {/* Message */}
      <span className="text-sm font-medium">{formattedMessage}</span>

      {/* Count badge (optional emphasis) */}
      {displayCount <= 5 && (
        <span className={`${styles.badge} text-xs font-bold px-2 py-0.5 rounded-full`}>
          {displayCount}
        </span>
      )}

      {/* Fire icon for critical scarcity */}
      {urgencyLevel === 'critical' && (
        <svg
          className="w-4 h-4 text-red-500 animate-bounce"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE VERSION (for product cards)
// ═══════════════════════════════════════════════════════════════════════════════

export function ScarcityBadge({
  count,
  type = 'stock',
  animate = true,
}: {
  count: number;
  type?: 'stock' | 'spots' | 'availability';
  animate?: boolean;
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!animate) return;
    // Occasionally pulse for attention
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [animate]);

  if (count > 10) return null;

  const getMessage = () => {
    switch (type) {
      case 'stock':
        return count === 1 ? 'Only 1 left!' : `Only ${count} left`;
      case 'spots':
        return count === 1 ? 'Last spot!' : `${count} spots left`;
      case 'availability':
        return 'Limited time';
      default:
        return `${count} remaining`;
    }
  };

  const bgColor = count <= 3 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${bgColor} ${
        isAnimating ? 'animate-pulse' : ''
      }`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {getMessage()}
    </span>
  );
}

export default ScarcityIndicator;
