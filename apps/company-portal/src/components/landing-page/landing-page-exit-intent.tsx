'use client';

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface LandingPageExitIntentProps {
  /** Heading text */
  heading?: string;
  /** Subheading text */
  subheading?: string;
  /** CTA button text */
  ctaText?: string;
  /** Dismiss button text */
  dismissText?: string;
  /** Discount code to show (optional) */
  discountCode?: string;
  /** Discount percentage (optional) */
  discountPercent?: number;
  /** Callback when CTA clicked */
  onCtaClick?: () => void;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Only show once per session */
  showOnce?: boolean;
  /** Delay in ms before enabling exit intent detection */
  enableDelay?: number;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Exit Intent Detection Hook
// ============================================================================

// ============================================================================
// Focus Trap Hook
// ============================================================================

function useFocusTrap(
  containerRef: RefObject<HTMLDivElement>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

// ============================================================================
// Exit Intent Detection Hook
// ============================================================================

function useExitIntent(
  enabled: boolean,
  delay: number,
  onExitIntent: () => void
) {
  const isEnabledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Enable detection after delay
    const enableTimeout = setTimeout(() => {
      isEnabledRef.current = true;
    }, delay);

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves toward top of screen
      if (isEnabledRef.current && e.clientY <= 0) {
        onExitIntent();
      }
    };

    // Also detect on mobile when user scrolls up quickly
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // If user scrolls up quickly from bottom of page
      if (
        isEnabledRef.current &&
        currentScrollY < lastScrollY - 100 &&
        currentScrollY < 100
      ) {
        onExitIntent();
      }
      lastScrollY = currentScrollY;
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(enableTimeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, delay, onExitIntent]);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageExitIntent - Exit intent popup to prevent abandonment
 *
 * Features:
 * - Detects mouse leaving viewport (desktop)
 * - Detects quick scroll up (mobile)
 * - Optional discount code offer
 * - Smooth animations
 * - Respects "show once" preference
 */
export function LandingPageExitIntent({
  heading = 'Before you go...',
  subheading = 'Your cart is still here whenever you\'re ready',
  ctaText = 'Back to My Cart',
  dismissText = 'Not right now',
  discountCode,
  discountPercent,
  onCtaClick,
  onDismiss,
  showOnce = true,
  enableDelay = 5000,
  className = '',
}: LandingPageExitIntentProps) {
  const { cartCount, openCartDrawer } = useLandingPage();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap for accessibility (WCAG 2.4.3)
  useFocusTrap(modalRef, isVisible);

  // Check session storage for "already shown" flag
  useEffect(() => {
    if (showOnce && typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('lp-exit-intent-shown');
      if (shown === 'true') {
        setHasShown(true);
      }
    }
  }, [showOnce]);

  const handleExitIntent = useCallback(() => {
    // Only show if cart has items and hasn't been shown
    if (cartCount > 0 && !hasShown && !isVisible) {
      setIsVisible(true);
      setHasShown(true);
      if (showOnce && typeof window !== 'undefined') {
        sessionStorage.setItem('lp-exit-intent-shown', 'true');
      }
    }
  }, [cartCount, hasShown, isVisible, showOnce]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleCtaClick = useCallback(() => {
    setIsVisible(false);
    if (onCtaClick) {
      onCtaClick();
    } else {
      openCartDrawer();
    }
  }, [onCtaClick, openCartDrawer]);

  // Exit intent detection
  useExitIntent(
    cartCount > 0 && !hasShown,
    enableDelay,
    handleExitIntent
  );

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleDismiss]);

  // Lock body scroll when visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 z-50
        flex items-center justify-center
        p-4
        ${className}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-heading"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="
          relative
          w-full max-w-md
          bg-white dark:bg-gray-800 rounded-2xl
          shadow-2xl
          overflow-hidden
          animate-slideUp
        "
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="
            absolute top-4 right-4
            p-2 min-w-[44px] min-h-[44px]
            flex items-center justify-center
            text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300
            rounded-full hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
            touch-manipulation
            z-10
          "
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6 pt-12 text-center">
          {/* Discount Badge */}
          {discountPercent && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold rounded-full mb-4">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              {discountPercent}% OFF
            </div>
          )}

          {/* Heading */}
          <h2
            id="exit-intent-heading"
            className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            {heading}
          </h2>

          {/* Subheading */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {subheading}
          </p>

          {/* Discount Code */}
          {discountCode && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Use code at checkout:</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <code className="font-mono font-bold text-lg text-[var(--lp-primary,#667eea)]">
                  {discountCode}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(discountCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    } catch {
                      // Clipboard API may not be available in some contexts
                    }
                  }}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation"
                  aria-label={codeCopied ? 'Copied!' : 'Copy discount code'}
                >
                  {codeCopied ? (
                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button
            type="button"
            onClick={handleCtaClick}
            className="
              w-full py-4 min-h-[56px]
              bg-[var(--lp-primary,#667eea)] text-white
              font-semibold text-lg
              rounded-xl
              hover:opacity-90
              transition-all duration-200
              touch-manipulation
              active:scale-[0.98]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-primary,#667eea)]
            "
          >
            {ctaText}
          </button>

          {/* Dismiss Link */}
          <button
            type="button"
            onClick={handleDismiss}
            className="
              mt-3 py-2
              text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
              underline underline-offset-2
              touch-manipulation
              min-h-[44px]
            "
          >
            {dismissText}
          </button>
        </div>

        {/* Trust indicators */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Money Back
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Fast Shipping
            </span>
          </div>
        </div>
      </div>

      {/* CSS Animation Keyframes with reduced motion support */}
      <style>{`
        @keyframes lp-exit-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lp-exit-slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: lp-exit-fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: lp-exit-slideUp 0.3s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn,
          .animate-slideUp {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPageExitIntent;
