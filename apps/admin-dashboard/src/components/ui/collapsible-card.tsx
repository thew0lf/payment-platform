'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  /** Unique ID for localStorage persistence */
  storageKey?: string;
  className?: string;
  /** Called when open state changes */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * CollapsibleCard - Animated collapsible card section for product pages
 *
 * Features:
 * - Smooth height animation on expand/collapse
 * - Optional localStorage persistence of open state
 * - Icon and badge support in header
 * - Accessible with keyboard navigation
 */
export function CollapsibleCard({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  badge,
  children,
  storageKey,
  className,
  onOpenChange,
}: CollapsibleCardProps) {
  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Initialize state from localStorage if storageKey provided
  const [isOpen, setIsOpen] = React.useState(() => {
    if (typeof window === 'undefined' || !storageKey) {
      return defaultOpen;
    }
    const stored = localStorage.getItem(`collapsible-card-${storageKey}`);
    return stored !== null ? stored === 'true' : defaultOpen;
  });

  // Persist state to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.setItem(`collapsible-card-${storageKey}`, String(isOpen));
    }
  }, [isOpen, storageKey]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      {/* Header - clickable to toggle */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between p-4 md:p-6 text-left',
          'hover:bg-muted/50 transition-colors rounded-t-xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !isOpen && 'rounded-b-xl'
        )}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${storageKey || title}`}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Content - animated height with reduced motion support */}
      <div
        id={`collapsible-content-${storageKey || title}`}
        className={cn(
          'overflow-hidden',
          prefersReducedMotion
            ? (isOpen ? 'block' : 'hidden')
            : 'transition-all duration-200 ease-in-out',
          !prefersReducedMotion && (isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')
        )}
      >
        <div className="p-4 pt-0 md:p-6 md:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * CollapsibleCardHeader - For use within CollapsibleCard content when you need
 * a secondary header or section divider
 */
export function CollapsibleCardSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

export default CollapsibleCard;
