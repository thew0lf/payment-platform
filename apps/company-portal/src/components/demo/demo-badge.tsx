'use client';

import { useState, useCallback } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DemoBadgeProps {
  /** Show only if this is true */
  isVisible?: boolean;
  /** Custom message to display in tooltip */
  tooltipMessage?: string;
  /** Position of the badge */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Allow user to dismiss the badge */
  dismissible?: boolean;
}

/**
 * Demo Badge Component
 * Shows a "DEMO" overlay badge when viewing a demo funnel.
 * Appears in the corner of the screen with a tooltip on hover/focus/click.
 * Accessible via keyboard navigation.
 */
export function DemoBadge({
  isVisible = true,
  tooltipMessage = 'This is a demo funnel. Data resets periodically.',
  position = 'top-right',
  dismissible = true,
}: DemoBadgeProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Handle tooltip toggle for touch/click (accessibility)
  const handleBadgeClick = useCallback(() => {
    setShowTooltip((prev) => !prev);
  }, []);

  // Handle keyboard activation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowTooltip((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setShowTooltip(false);
    }
  }, []);

  if (!isVisible || isDismissed) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const tooltipPositionClasses = {
    'top-right': 'right-0 top-full mt-2',
    'top-left': 'left-0 top-full mt-2',
    'bottom-right': 'right-0 bottom-full mb-2',
    'bottom-left': 'left-0 bottom-full mb-2',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge - now focusable and clickable for accessibility */}
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={handleBadgeClick}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 backdrop-blur-sm text-white text-sm font-bold rounded-full shadow-lg border border-amber-400/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-amber-500"
          aria-label="Demo mode - click or press Enter for details"
          aria-expanded={showTooltip}
          aria-describedby="demo-tooltip"
        >
          <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
          <span>DEMO</span>
          {dismissible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="ml-1 p-2 -m-1 hover:bg-amber-600/50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Dismiss demo badge"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Tooltip - accessible via hover, focus, and click */}
        {showTooltip && (
          <div
            id="demo-tooltip"
            role="tooltip"
            className={`absolute ${tooltipPositionClasses[position]} w-64 p-3 bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg shadow-xl border border-gray-700/50 animate-in fade-in duration-200`}
          >
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium text-amber-400 mb-1">Demo Mode</p>
                <p className="text-gray-300 text-xs leading-relaxed">{tooltipMessage}</p>
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-gray-400 text-xs">
                    <span className="font-medium text-gray-300">Test card:</span> 4111 1111 1111 1111
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Check if a funnel should show demo mode
 * @param seoSlug - The SEO slug of the funnel
 * @param isDemoMode - Explicit demo mode flag from funnel settings
 * @returns boolean indicating if demo mode should be shown
 */
export function shouldShowDemoMode(seoSlug?: string, isDemoMode?: boolean): boolean {
  // Explicit demo mode flag takes precedence
  if (isDemoMode !== undefined) {
    return isDemoMode;
  }

  // Check if slug contains demo patterns
  if (seoSlug) {
    const demoPatterns = ['demo', 'test', 'sample', 'example'];
    const slugLower = seoSlug.toLowerCase();
    return demoPatterns.some((pattern) => slugLower.includes(pattern));
  }

  return false;
}

export default DemoBadge;
