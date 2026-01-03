'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsEvent {
  type: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ScrollDepthMilestone {
  percentage: number;
  reached: boolean;
  timestamp?: number;
}

export interface EngagementMetrics {
  timeOnPage: number;
  scrollDepth: number;
  interactions: number;
  lastActivity: number;
}

export interface LandingPageAnalyticsOptions {
  /** Enable scroll depth tracking */
  trackScrollDepth?: boolean;
  /** Scroll depth milestones to track (default: [25, 50, 75, 100]) */
  scrollMilestones?: number[];
  /** Enable time on page tracking */
  trackTimeOnPage?: boolean;
  /** Time interval for heartbeat events in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Enable click/tap tracking */
  trackClicks?: boolean;
  /** Enable visibility change tracking */
  trackVisibility?: boolean;
  /** Enable product impression tracking */
  trackProductImpressions?: boolean;
  /** Debounce time for scroll events in ms (default: 100) */
  scrollDebounce?: number;
}

// ============================================================================
// Analytics Hook
// ============================================================================

/**
 * useLandingPageAnalytics - Enhanced analytics tracking for landing pages
 *
 * Features:
 * - Scroll depth tracking with configurable milestones
 * - Time on page with heartbeat events
 * - Click/tap event tracking
 * - Page visibility tracking
 * - Product impression tracking via IntersectionObserver
 * - Engagement scoring
 */
export function useLandingPageAnalytics(options: LandingPageAnalyticsOptions = {}) {
  const {
    trackScrollDepth = true,
    scrollMilestones = [25, 50, 75, 100],
    trackTimeOnPage = true,
    heartbeatInterval = 30000,
    trackClicks = true,
    trackVisibility = true,
    scrollDebounce = 100,
  } = options;

  const { trackEvent, session, landingPage } = useLandingPage();

  // State
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    timeOnPage: 0,
    scrollDepth: 0,
    interactions: 0,
    lastActivity: Date.now(),
  });

  // Refs
  const startTimeRef = useRef<number>(Date.now());
  const scrollMilestonesRef = useRef<ScrollDepthMilestone[]>(
    scrollMilestones.map((p) => ({ percentage: p, reached: false }))
  );
  const lastScrollDepthRef = useRef<number>(0);
  const interactionCountRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------------------------
  // Page View Tracking
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!session) return;

    trackEvent('PAGE_VIEW', {
      landingPageId: landingPage?.id,
      landingPageName: landingPage?.name,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      timestamp: Date.now(),
    });
  }, [session, landingPage, trackEvent]);

  // -------------------------------------------------------------------------
  // Scroll Depth Tracking
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!trackScrollDepth || !session) return;

    const calculateScrollDepth = (): number => {
      if (typeof window === 'undefined') return 0;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight === 0) return 100;
      return Math.round((scrollTop / docHeight) * 100);
    };

    const handleScroll = () => {
      // Debounce scroll events
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const depth = calculateScrollDepth();
        lastScrollDepthRef.current = depth;

        // Check milestones
        scrollMilestonesRef.current.forEach((milestone) => {
          if (!milestone.reached && depth >= milestone.percentage) {
            milestone.reached = true;
            milestone.timestamp = Date.now();

            trackEvent('SCROLL_DEPTH', {
              percentage: milestone.percentage,
              timeToReach: Date.now() - startTimeRef.current,
            });
          }
        });

        // Update engagement metrics
        setEngagementMetrics((prev) => ({
          ...prev,
          scrollDepth: Math.max(prev.scrollDepth, depth),
          lastActivity: Date.now(),
        }));
      }, scrollDebounce);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [trackScrollDepth, session, trackEvent, scrollDebounce]);

  // -------------------------------------------------------------------------
  // Time on Page Tracking
  // Note: Heartbeat events are only sent when page is visible (isVisibleRef)
  // This prevents sending metrics during background tab periods
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!trackTimeOnPage || !session) return;

    const heartbeatTimer = setInterval(() => {
      // Only send heartbeat when page is visible to avoid sending
      // metrics when user is not actively viewing the page
      if (isVisibleRef.current) {
        const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);

        trackEvent('TIME_ON_PAGE_HEARTBEAT', {
          timeOnPage,
          scrollDepth: lastScrollDepthRef.current,
          interactions: interactionCountRef.current,
        });

        setEngagementMetrics((prev) => ({
          ...prev,
          timeOnPage,
        }));
      }
    }, heartbeatInterval);

    return () => clearInterval(heartbeatTimer);
  }, [trackTimeOnPage, session, heartbeatInterval, trackEvent]);

  // -------------------------------------------------------------------------
  // Click/Tap Tracking (with throttling to prevent event flooding)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!trackClicks || !session) return;

    let lastClickTime = 0;
    const CLICK_THROTTLE_MS = 200; // Throttle rapid clicks

    const handleClick = (e: MouseEvent | TouchEvent) => {
      // Throttle clicks to prevent flooding
      const now = Date.now();
      if (now - lastClickTime < CLICK_THROTTLE_MS) {
        return;
      }
      lastClickTime = now;

      const target = e.target as HTMLElement;
      interactionCountRef.current += 1;

      // Get element info
      const elementInfo = {
        tagName: target.tagName.toLowerCase(),
        id: target.id || undefined,
        className: target.className || undefined,
        text: target.textContent?.slice(0, 50) || undefined,
        href: (target as HTMLAnchorElement).href || undefined,
        dataTrack: target.dataset.track || undefined,
      };

      // Only track meaningful interactions
      const trackableElements = ['button', 'a', 'input', 'select', 'textarea'];
      const isTrackable =
        trackableElements.includes(elementInfo.tagName) ||
        target.hasAttribute('data-track') ||
        target.closest('[data-track]');

      if (isTrackable) {
        trackEvent('ELEMENT_CLICK', {
          ...elementInfo,
          x: 'clientX' in e ? e.clientX : undefined,
          y: 'clientY' in e ? e.clientY : undefined,
        });
      }

      setEngagementMetrics((prev) => ({
        ...prev,
        interactions: interactionCountRef.current,
        lastActivity: Date.now(),
      }));
    };

    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('touchend', handleClick, { passive: true });

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchend', handleClick);
    };
  }, [trackClicks, session, trackEvent]);

  // -------------------------------------------------------------------------
  // Visibility Tracking
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!trackVisibility || !session) return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isVisibleRef.current = isVisible;

      trackEvent(isVisible ? 'PAGE_VISIBLE' : 'PAGE_HIDDEN', {
        timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
        scrollDepth: lastScrollDepthRef.current,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [trackVisibility, session, trackEvent]);

  // -------------------------------------------------------------------------
  // Page Unload Tracking
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!session) return;

    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      const maxScrollDepth = lastScrollDepthRef.current;

      // Use sendBeacon for reliable delivery
      if (typeof navigator.sendBeacon === 'function') {
        const data = JSON.stringify({
          type: 'PAGE_EXIT',
          metadata: {
            timeOnPage,
            scrollDepth: maxScrollDepth,
            interactions: interactionCountRef.current,
            milestonesReached: scrollMilestonesRef.current
              .filter((m) => m.reached)
              .map((m) => m.percentage),
          },
        });

        // This would need a beacon endpoint in production
        // navigator.sendBeacon('/api/analytics/beacon', data);
      }

      // Also fire via trackEvent (may not complete)
      trackEvent('PAGE_EXIT', {
        timeOnPage,
        scrollDepth: maxScrollDepth,
        interactions: interactionCountRef.current,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session, trackEvent]);

  // -------------------------------------------------------------------------
  // Product Impression Tracking
  // -------------------------------------------------------------------------

  const trackProductImpression = useCallback(
    (productId: string, metadata?: Record<string, unknown>) => {
      trackEvent('PRODUCT_IMPRESSION', {
        productId,
        timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
        scrollDepth: lastScrollDepthRef.current,
        ...metadata,
      });
    },
    [trackEvent]
  );

  const createProductObserver = useCallback(
    (callback?: (productId: string) => void) => {
      if (typeof window === 'undefined') return null;

      const observedProducts = new Set<string>();

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const productId = (entry.target as HTMLElement).dataset.productId;
              if (productId && !observedProducts.has(productId)) {
                observedProducts.add(productId);
                trackProductImpression(productId, {
                  position: (entry.target as HTMLElement).dataset.position,
                });
                callback?.(productId);
              }
            }
          });
        },
        {
          threshold: 0.5, // 50% visible
          rootMargin: '0px',
        }
      );

      return observer;
    },
    [trackProductImpression]
  );

  // -------------------------------------------------------------------------
  // Custom Event Tracking Helpers
  // -------------------------------------------------------------------------

  const trackCTAClick = useCallback(
    (ctaId: string, ctaText: string, destination?: string) => {
      trackEvent('CTA_CLICK', {
        ctaId,
        ctaText,
        destination,
        timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
        scrollDepth: lastScrollDepthRef.current,
      });
    },
    [trackEvent]
  );

  const trackFormStart = useCallback(
    (formId: string, formName?: string) => {
      trackEvent('FORM_START', {
        formId,
        formName,
        timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    },
    [trackEvent]
  );

  const trackFormComplete = useCallback(
    (formId: string, formName?: string, fieldsCompleted?: number) => {
      trackEvent('FORM_COMPLETE', {
        formId,
        formName,
        fieldsCompleted,
        timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    },
    [trackEvent]
  );

  const trackFormAbandon = useCallback(
    (formId: string, lastField?: string, fieldsCompleted?: number) => {
      trackEvent('FORM_ABANDON', {
        formId,
        lastField,
        fieldsCompleted,
        timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    },
    [trackEvent]
  );

  // -------------------------------------------------------------------------
  // Engagement Score Calculator
  // -------------------------------------------------------------------------

  const calculateEngagementScore = useCallback((): number => {
    const { timeOnPage, scrollDepth, interactions } = engagementMetrics;

    // Weighted scoring
    const timeScore = Math.min(timeOnPage / 60, 10) * 2; // Max 20 points for 10+ min
    const scrollScore = (scrollDepth / 100) * 30; // Max 30 points for 100% scroll
    const interactionScore = Math.min(interactions, 10) * 5; // Max 50 points for 10+ interactions

    return Math.round(timeScore + scrollScore + interactionScore);
  }, [engagementMetrics]);

  return {
    // Metrics
    engagementMetrics,
    engagementScore: calculateEngagementScore(),

    // Event tracking helpers
    trackProductImpression,
    createProductObserver,
    trackCTAClick,
    trackFormStart,
    trackFormComplete,
    trackFormAbandon,

    // Raw tracking (pass-through)
    trackEvent,
  };
}

// ============================================================================
// Analytics Provider Component (Optional wrapper)
// ============================================================================

export interface LandingPageAnalyticsProviderProps {
  children: React.ReactNode;
  options?: LandingPageAnalyticsOptions;
}

/**
 * LandingPageAnalyticsProvider - Wrapper component that automatically
 * initializes analytics tracking
 */
export function LandingPageAnalyticsProvider({
  children,
  options,
}: LandingPageAnalyticsProviderProps) {
  // Initialize analytics (side effects)
  useLandingPageAnalytics(options);

  return <>{children}</>;
}

export default useLandingPageAnalytics;
