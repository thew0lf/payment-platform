'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface ClickIdentifiers {
  gclid?: string; // Google Ads
  fbclid?: string; // Facebook/Meta
  msclkid?: string; // Microsoft Ads
  ttclid?: string; // TikTok
  li_fat_id?: string; // LinkedIn
  twclid?: string; // Twitter/X
  dclid?: string; // DoubleClick
}

export interface AttributionTouch {
  timestamp: number;
  source: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingUrl: string;
  clickIds?: ClickIdentifiers;
}

export interface AttributionData {
  /** First interaction with the site */
  firstTouch: AttributionTouch | null;
  /** Most recent interaction before conversion */
  lastTouch: AttributionTouch | null;
  /** All touches in the customer journey */
  allTouches: AttributionTouch[];
  /** Current session UTM parameters */
  currentUtm: UTMParameters;
  /** Current session click identifiers */
  currentClickIds: ClickIdentifiers;
  /** Original referrer */
  referrer: string | null;
  /** Device type */
  device: string;
  /** Landing URL */
  landingUrl: string;
}

export interface LandingPageAttributionOptions {
  /** Storage key prefix for attribution data */
  storagePrefix?: string;
  /** Max number of touches to store */
  maxTouches?: number;
  /** Touch expiry in days (default: 30) */
  touchExpiryDays?: number;
  /** Enable cross-domain tracking via URL params */
  enableCrossDomain?: boolean;
  /** Auto-track attribution on mount */
  autoTrack?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STORAGE_PREFIX = 'lp_attr';
const DEFAULT_MAX_TOUCHES = 10;
const DEFAULT_TOUCH_EXPIRY_DAYS = 30;

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

const CLICK_ID_PARAMS = [
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'li_fat_id',
  'twclid',
  'dclid',
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseUTMFromUrl(url: string): UTMParameters {
  try {
    const searchParams = new URL(url).searchParams;
    const utm: UTMParameters = {};

    UTM_PARAMS.forEach((param) => {
      const value = searchParams.get(param);
      if (value) {
        const key = param.replace('utm_', '') as keyof UTMParameters;
        utm[key] = value;
      }
    });

    return utm;
  } catch {
    return {};
  }
}

function parseClickIdsFromUrl(url: string): ClickIdentifiers {
  try {
    const searchParams = new URL(url).searchParams;
    const clickIds: ClickIdentifiers = {};

    CLICK_ID_PARAMS.forEach((param) => {
      const value = searchParams.get(param);
      if (value) {
        clickIds[param as keyof ClickIdentifiers] = value;
      }
    });

    return clickIds;
  } catch {
    return {};
  }
}

function inferSourceFromReferrer(referrer: string): { source: string; medium: string } {
  if (!referrer) {
    return { source: 'direct', medium: 'none' };
  }

  try {
    const url = new URL(referrer);
    const domain = url.hostname.toLowerCase();

    // Search engines
    if (domain.includes('google')) return { source: 'google', medium: 'organic' };
    if (domain.includes('bing')) return { source: 'bing', medium: 'organic' };
    if (domain.includes('yahoo')) return { source: 'yahoo', medium: 'organic' };
    if (domain.includes('duckduckgo')) return { source: 'duckduckgo', medium: 'organic' };
    if (domain.includes('baidu')) return { source: 'baidu', medium: 'organic' };

    // Social media
    if (domain.includes('facebook') || domain.includes('fb.com'))
      return { source: 'facebook', medium: 'social' };
    if (domain.includes('instagram')) return { source: 'instagram', medium: 'social' };
    if (domain.includes('twitter') || domain.includes('t.co') || domain.includes('x.com'))
      return { source: 'twitter', medium: 'social' };
    if (domain.includes('linkedin')) return { source: 'linkedin', medium: 'social' };
    if (domain.includes('pinterest')) return { source: 'pinterest', medium: 'social' };
    if (domain.includes('tiktok')) return { source: 'tiktok', medium: 'social' };
    if (domain.includes('youtube')) return { source: 'youtube', medium: 'social' };
    if (domain.includes('reddit')) return { source: 'reddit', medium: 'social' };

    // Default to referral
    return { source: domain, medium: 'referral' };
  } catch {
    return { source: 'unknown', medium: 'referral' };
  }
}

// ============================================================================
// Attribution Hook
// ============================================================================

/**
 * useLandingPageAttribution - Multi-touch attribution tracking
 *
 * Features:
 * - First touch / last touch attribution
 * - Multi-touch journey tracking
 * - UTM parameter parsing and storage
 * - Click ID tracking (gclid, fbclid, etc.)
 * - Referrer-based source inference
 * - Cross-domain tracking support
 * - Persistent storage with expiry
 */
export function useLandingPageAttribution(options: LandingPageAttributionOptions = {}) {
  const {
    storagePrefix = DEFAULT_STORAGE_PREFIX,
    maxTouches = DEFAULT_MAX_TOUCHES,
    touchExpiryDays = DEFAULT_TOUCH_EXPIRY_DAYS,
    autoTrack = true,
  } = options;

  const { trackEvent, session } = useLandingPage();

  // State
  const [attributionData, setAttributionData] = useState<AttributionData>({
    firstTouch: null,
    lastTouch: null,
    allTouches: [],
    currentUtm: {},
    currentClickIds: {},
    referrer: null,
    device: 'unknown',
    landingUrl: '',
  });

  // Refs
  const isInitializedRef = useRef(false);

  // Storage keys
  const FIRST_TOUCH_KEY = `${storagePrefix}_first_touch`;
  const TOUCHES_KEY = `${storagePrefix}_touches`;
  const EXPIRY_KEY = `${storagePrefix}_expiry`;

  // -------------------------------------------------------------------------
  // Storage Helpers
  // -------------------------------------------------------------------------

  const getStoredData = useCallback(
    function getStoredDataFn<T>(key: string): T | null {
      if (typeof window === 'undefined') return null;
      try {
        const data = localStorage.getItem(key);
        if (!data) return null;

        // Check expiry
        const expiryStr = localStorage.getItem(EXPIRY_KEY);
        if (expiryStr) {
          const expiry = new Date(expiryStr);
          if (new Date() > expiry) {
            // Data expired, clear it
            localStorage.removeItem(key);
            localStorage.removeItem(EXPIRY_KEY);
            return null;
          }
        }

        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    },
    [EXPIRY_KEY]
  );

  const setStoredData = useCallback(
    function setStoredDataFn<T>(key: string, data: T): void {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(key, JSON.stringify(data));

        // Set/update expiry
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + touchExpiryDays);
        localStorage.setItem(EXPIRY_KEY, expiry.toISOString());
      } catch {
        console.warn('Failed to store attribution data');
      }
    },
    [EXPIRY_KEY, touchExpiryDays]
  );

  // -------------------------------------------------------------------------
  // Attribution Tracking
  // -------------------------------------------------------------------------

  const createCurrentTouch = useCallback((): AttributionTouch => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';

    const utm = parseUTMFromUrl(currentUrl);
    const clickIds = parseClickIdsFromUrl(currentUrl);

    // Determine source
    let source = utm.source;
    let medium = utm.medium;

    if (!source) {
      const inferred = inferSourceFromReferrer(referrer);
      source = inferred.source;
      medium = medium || inferred.medium;
    }

    return {
      timestamp: Date.now(),
      source: source || 'direct',
      medium,
      campaign: utm.campaign,
      referrer: referrer || undefined,
      landingUrl: currentUrl,
      clickIds: Object.keys(clickIds).length > 0 ? clickIds : undefined,
    };
  }, []);

  const recordTouch = useCallback(() => {
    const currentTouch = createCurrentTouch();

    // Get existing data
    let firstTouch = getStoredData<AttributionTouch>(FIRST_TOUCH_KEY);
    const existingTouches = getStoredData<AttributionTouch[]>(TOUCHES_KEY) || [];

    // Set first touch if not exists
    if (!firstTouch) {
      firstTouch = currentTouch;
      setStoredData(FIRST_TOUCH_KEY, firstTouch);
    }

    // Add to touches array (maintain max limit)
    const allTouches = [...existingTouches, currentTouch].slice(-maxTouches);
    setStoredData(TOUCHES_KEY, allTouches);

    // Update state
    const newAttributionData: AttributionData = {
      firstTouch,
      lastTouch: currentTouch,
      allTouches,
      currentUtm: parseUTMFromUrl(currentTouch.landingUrl),
      currentClickIds: currentTouch.clickIds || {},
      referrer: currentTouch.referrer || null,
      device: getDeviceType(),
      landingUrl: currentTouch.landingUrl,
    };

    setAttributionData(newAttributionData);

    // Track attribution event
    trackEvent('ATTRIBUTION_CAPTURED', {
      source: currentTouch.source,
      medium: currentTouch.medium,
      campaign: currentTouch.campaign,
      isFirstTouch: existingTouches.length === 0,
      touchNumber: allTouches.length,
      hasClickIds: !!currentTouch.clickIds,
    });

    return newAttributionData;
  }, [createCurrentTouch, getStoredData, setStoredData, trackEvent, FIRST_TOUCH_KEY, TOUCHES_KEY, maxTouches]);

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInitializedRef.current) return;
    if (!session && autoTrack) return; // Wait for session if auto-tracking

    isInitializedRef.current = true;

    if (autoTrack) {
      recordTouch();
    } else {
      // Just load existing data without recording new touch
      const firstTouch = getStoredData<AttributionTouch>(FIRST_TOUCH_KEY);
      const allTouches = getStoredData<AttributionTouch[]>(TOUCHES_KEY) || [];
      const currentUrl = window.location.href;

      setAttributionData({
        firstTouch,
        lastTouch: allTouches[allTouches.length - 1] || null,
        allTouches,
        currentUtm: parseUTMFromUrl(currentUrl),
        currentClickIds: parseClickIdsFromUrl(currentUrl),
        referrer: document.referrer || null,
        device: getDeviceType(),
        landingUrl: currentUrl,
      });
    }
  }, [session, autoTrack, recordTouch, getStoredData, FIRST_TOUCH_KEY, TOUCHES_KEY]);

  // -------------------------------------------------------------------------
  // Attribution Helpers
  // -------------------------------------------------------------------------

  /**
   * Get attribution data for conversion tracking
   */
  const getConversionAttribution = useCallback((): Record<string, unknown> => {
    const { firstTouch, lastTouch, allTouches, currentUtm, currentClickIds } = attributionData;

    return {
      // First touch attribution
      firstTouch: firstTouch
        ? {
            source: firstTouch.source,
            medium: firstTouch.medium,
            campaign: firstTouch.campaign,
            timestamp: firstTouch.timestamp,
          }
        : null,

      // Last touch attribution
      lastTouch: lastTouch
        ? {
            source: lastTouch.source,
            medium: lastTouch.medium,
            campaign: lastTouch.campaign,
            timestamp: lastTouch.timestamp,
          }
        : null,

      // Multi-touch journey
      touchCount: allTouches.length,
      uniqueSources: Array.from(new Set(allTouches.map((t) => t.source))),

      // Current session
      utm: currentUtm,
      clickIds: currentClickIds,

      // Time to convert
      firstTouchToNow: firstTouch ? Date.now() - firstTouch.timestamp : null,
    };
  }, [attributionData]);

  /**
   * Get URL parameters for cross-domain tracking
   */
  const getCrossDomainParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams();
    const { currentUtm, currentClickIds, firstTouch } = attributionData;

    // Add UTM params
    Object.entries(currentUtm).forEach(([key, value]) => {
      if (value) params.set(`utm_${key}`, value);
    });

    // Add click IDs
    Object.entries(currentClickIds).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    // Add first touch reference
    if (firstTouch) {
      params.set('_fts', firstTouch.source);
      params.set('_ftt', String(firstTouch.timestamp));
    }

    return params;
  }, [attributionData]);

  /**
   * Append attribution params to a URL for cross-domain tracking
   */
  const appendAttributionToUrl = useCallback(
    (url: string): string => {
      try {
        const urlObj = new URL(url);
        const crossDomainParams = getCrossDomainParams();

        crossDomainParams.forEach((value, key) => {
          if (!urlObj.searchParams.has(key)) {
            urlObj.searchParams.set(key, value);
          }
        });

        return urlObj.toString();
      } catch {
        return url;
      }
    },
    [getCrossDomainParams]
  );

  /**
   * Clear all attribution data
   */
  const clearAttribution = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(FIRST_TOUCH_KEY);
    localStorage.removeItem(TOUCHES_KEY);
    localStorage.removeItem(EXPIRY_KEY);

    setAttributionData({
      firstTouch: null,
      lastTouch: null,
      allTouches: [],
      currentUtm: {},
      currentClickIds: {},
      referrer: null,
      device: 'unknown',
      landingUrl: '',
    });
  }, [FIRST_TOUCH_KEY, TOUCHES_KEY, EXPIRY_KEY]);

  /**
   * Manually record a new touch (for SPA navigation)
   */
  const manualRecordTouch = useCallback(() => {
    isInitializedRef.current = false;
    return recordTouch();
  }, [recordTouch]);

  return {
    // Attribution data
    attributionData,
    firstTouch: attributionData.firstTouch,
    lastTouch: attributionData.lastTouch,
    allTouches: attributionData.allTouches,
    currentUtm: attributionData.currentUtm,
    currentClickIds: attributionData.currentClickIds,

    // Helpers
    getConversionAttribution,
    getCrossDomainParams,
    appendAttributionToUrl,
    clearAttribution,
    recordTouch: manualRecordTouch,

    // Computed
    touchCount: attributionData.allTouches.length,
    isReturningVisitor: attributionData.allTouches.length > 1,
    primarySource: attributionData.lastTouch?.source || attributionData.firstTouch?.source || 'direct',
  };
}

// ============================================================================
// Attribution Display Component
// ============================================================================

export interface AttributionDebugProps {
  /** Show only in development */
  devOnly?: boolean;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Optional className */
  className?: string;
}

/**
 * AttributionDebug - Debug overlay showing attribution data
 * Useful for testing and QA
 *
 * Accessibility: Uses role="status" and aria-live="polite" for screen reader support
 */
export function AttributionDebug({
  devOnly = true,
  position = 'bottom-right',
  className = '',
}: AttributionDebugProps) {
  const { attributionData, touchCount } = useLandingPageAttribution({ autoTrack: false });

  // Don't render in production if devOnly
  if (devOnly && process.env.NODE_ENV === 'production') {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Attribution debug information"
      className={`
        fixed ${positionClasses[position]}
        max-w-xs p-3 bg-black/80 text-white text-xs
        rounded-lg shadow-lg z-50
        font-mono
        ${className}
      `}
    >
      <h3 className="font-bold mb-2" id="attribution-debug-heading">Attribution Debug</h3>

      <dl className="space-y-1" aria-labelledby="attribution-debug-heading">
        <div>
          <dt className="text-gray-400 inline">Source:</dt>{' '}
          <dd className="inline">{attributionData.lastTouch?.source || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-gray-400 inline">Medium:</dt>{' '}
          <dd className="inline">{attributionData.lastTouch?.medium || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-gray-400 inline">Campaign:</dt>{' '}
          <dd className="inline">{attributionData.currentUtm.campaign || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-gray-400 inline">Touches:</dt>{' '}
          <dd className="inline">{touchCount}</dd>
        </div>
        <div>
          <dt className="text-gray-400 inline">Device:</dt>{' '}
          <dd className="inline">{attributionData.device}</dd>
        </div>
        {Object.keys(attributionData.currentClickIds).length > 0 && (
          <div>
            <dt className="text-gray-400 inline">Click IDs:</dt>{' '}
            <dd className="inline">{Object.keys(attributionData.currentClickIds).join(', ')}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

export default useLandingPageAttribution;
