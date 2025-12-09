'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { SocialProofPopup } from './social-proof-popup';
import { UrgencyTimer } from './urgency-timer';
import { ScarcityIndicator } from './scarcity-indicator';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SocialProofConfig {
  enabled: boolean;
  type: 'recent_purchase' | 'active_viewers' | 'total_purchases' | 'rating';
  displayInterval: number;
  displayDuration: number;
  minDelay: number;
  maxDelay: number;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  showOnStages: string[];
}

interface UrgencyConfig {
  enabled: boolean;
  type: 'countdown' | 'limited_time' | 'ending_soon';
  duration: number;
  message: string;
  expiredMessage?: string;
  showOnStages: string[];
  position: 'banner' | 'inline' | 'floating';
  style: 'warning' | 'info' | 'danger';
}

interface ScarcityConfig {
  enabled: boolean;
  type: 'stock' | 'spots' | 'availability';
  threshold: number;
  message: string;
  showOnStages: string[];
  animate: boolean;
}

interface InterventionConfig {
  socialProof?: SocialProofConfig;
  urgency?: UrgencyConfig;
  scarcity?: ScarcityConfig;
}

interface SocialProofNotification {
  id: string;
  name: string;
  location: string;
  product: string;
  timeAgo: string;
  avatarUrl?: string;
}

interface InterventionContextValue {
  config: InterventionConfig;
  notifications: SocialProofNotification[];
  isLoading: boolean;
  trackEvent: (
    interventionType: string,
    action: 'shown' | 'clicked' | 'dismissed' | 'converted',
    metadata?: Record<string, unknown>
  ) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const InterventionContext = createContext<InterventionContextValue | null>(null);

export function useInterventions() {
  const context = useContext(InterventionContext);
  if (!context) {
    throw new Error('useInterventions must be used within an InterventionProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface InterventionProviderProps {
  children: ReactNode;
  funnelId: string;
  sessionToken?: string;
  currentStage: string;
  apiUrl?: string;
}

export function InterventionProvider({
  children,
  funnelId,
  sessionToken,
  currentStage,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
}: InterventionProviderProps) {
  const [config, setConfig] = useState<InterventionConfig>({});
  const [notifications, setNotifications] = useState<SocialProofNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch intervention config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/funnels/public/${funnelId}/interventions/config`
        );
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to fetch intervention config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [funnelId, apiUrl]);

  // Fetch social proof notifications
  useEffect(() => {
    if (!config.socialProof?.enabled) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/funnels/public/${funnelId}/interventions/social-proof?count=20`
        );
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to fetch social proof notifications:', error);
      }
    };

    fetchNotifications();
  }, [funnelId, apiUrl, config.socialProof?.enabled]);

  // Track intervention event
  const trackEvent = useCallback(
    async (
      interventionType: string,
      action: 'shown' | 'clicked' | 'dismissed' | 'converted',
      metadata?: Record<string, unknown>
    ) => {
      if (!sessionToken) return;

      try {
        await fetch(`${apiUrl}/api/funnels/public/${funnelId}/interventions/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionToken,
            interventionType,
            action,
            metadata,
          }),
        });
      } catch (error) {
        console.error('Failed to track intervention event:', error);
      }
    },
    [funnelId, sessionToken, apiUrl]
  );

  // Handle social proof events
  const handleSocialProofShown = useCallback(
    (notification: SocialProofNotification) => {
      trackEvent('social_proof', 'shown', { notificationId: notification.id });
    },
    [trackEvent]
  );

  const handleSocialProofClicked = useCallback(
    (notification: SocialProofNotification) => {
      trackEvent('social_proof', 'clicked', { notificationId: notification.id });
    },
    [trackEvent]
  );

  const handleSocialProofDismissed = useCallback(
    (notification: SocialProofNotification) => {
      trackEvent('social_proof', 'dismissed', { notificationId: notification.id });
    },
    [trackEvent]
  );

  // Handle urgency expired
  const handleUrgencyExpired = useCallback(() => {
    trackEvent('urgency', 'shown', { expired: true });
  }, [trackEvent]);

  const value: InterventionContextValue = {
    config,
    notifications,
    isLoading,
    trackEvent,
  };

  return (
    <InterventionContext.Provider value={value}>
      {children}

      {/* Social Proof Popup */}
      {config.socialProof?.enabled && (
        <SocialProofPopup
          config={config.socialProof}
          notifications={notifications}
          currentStage={currentStage}
          onShown={handleSocialProofShown}
          onClicked={handleSocialProofClicked}
          onDismissed={handleSocialProofDismissed}
        />
      )}

      {/* Urgency Timer (floating position - rendered here) */}
      {config.urgency?.enabled && config.urgency.position === 'floating' && (
        <UrgencyTimer
          config={config.urgency}
          currentStage={currentStage}
          sessionToken={sessionToken}
          onExpired={handleUrgencyExpired}
        />
      )}
    </InterventionContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE COMPONENTS (for use within stages)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Urgency Timer Banner - use this at the top of a stage
 */
export function UrgencyBanner() {
  const { config } = useInterventions();
  const urgency = config.urgency;

  if (!urgency?.enabled || urgency.position !== 'banner') return null;

  return (
    <UrgencyTimer
      config={urgency}
      currentStage="CHECKOUT" // Will always show on banner position
      sessionToken={undefined}
    />
  );
}

/**
 * Inline Urgency Timer - use this within content
 */
export function InlineUrgency({ currentStage }: { currentStage: string }) {
  const { config } = useInterventions();
  const urgency = config.urgency;

  if (!urgency?.enabled || urgency.position !== 'inline') return null;

  return <UrgencyTimer config={urgency} currentStage={currentStage} sessionToken={undefined} />;
}

/**
 * Scarcity Indicator - use within product cards or checkout
 */
export function InlineScarcity({
  currentStage,
  productName,
  customCount,
}: {
  currentStage: string;
  productName?: string;
  customCount?: number;
}) {
  const { config } = useInterventions();
  const scarcity = config.scarcity;

  if (!scarcity?.enabled) return null;

  return (
    <ScarcityIndicator
      config={scarcity}
      currentStage={currentStage}
      productName={productName}
      customCount={customCount}
    />
  );
}

export default InterventionProvider;
