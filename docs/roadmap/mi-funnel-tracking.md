# MI Funnel Tracking - Technical Specification

> **Last Updated:** December 7, 2025
> **Status:** Planning Phase
> **Related:** funnel-alpha-launch.md

---

## Overview

MI Funnel Tracking provides real-time behavioral analysis of customers as they progress through sales funnels. It calculates engagement scores, abandonment risk, and purchase intent to enable intelligent interventions that increase conversion rates.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MI FUNNEL TRACKING ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   FRONTEND (Company Portal)              BACKEND (API)                      │
│   ───────────────────────               ─────────────                       │
│   ┌─────────────────────┐               ┌─────────────────────┐            │
│   │   useMITracker()    │──── Events ──►│ MIFunnelTrackerSvc  │            │
│   │   Hook              │    (batched)  │                     │            │
│   └─────────────────────┘               └──────────┬──────────┘            │
│                                                    │                        │
│                                                    ▼                        │
│                                         ┌─────────────────────┐            │
│                                         │ MIFunnelScoringSvc  │            │
│                                         │ • Engagement Score  │            │
│                                         │ • Abandonment Risk  │            │
│                                         │ • Purchase Intent   │            │
│                                         └──────────┬──────────┘            │
│                                                    │                        │
│   ┌─────────────────────┐               ┌─────────┴──────────┐            │
│   │   Intervention      │◄── Trigger ───│ MIInterventionSvc  │            │
│   │   Components        │               │ • Exit Intent      │            │
│   └─────────────────────┘               │ • Help Nudge       │            │
│                                         │ • Upsell           │            │
│   STORAGE:                              └────────────────────┘            │
│   ┌─────────────────────┐                                                  │
│   │ PostgreSQL          │  Events, Sessions, Profiles                      │
│   │ Redis               │  Real-time Scores (TTL)                          │
│   └─────────────────────┘                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema Definitions

### FunnelVisitorProfile

Stores learned behavior patterns for returning visitors.

```prisma
model FunnelVisitorProfile {
  id              String   @id @default(cuid())

  // Identity (multiple methods)
  visitorFingerprint String?  @unique    // Browser fingerprint hash
  customerId      String?               // If known customer
  customer        Customer? @relation(fields: [customerId], references: [id])
  email           String?               // If captured

  // Aggregated Behavior
  totalSessions   Int      @default(0)
  totalPurchases  Int      @default(0)
  totalRevenue    Decimal  @default(0) @db.Decimal(10, 2)
  totalAbandons   Int      @default(0)

  // Preferences (Learned)
  preferredDevice String?              // 'desktop' | 'mobile' | 'tablet'
  preferredTimeOfDay Int?              // Hour most active (0-23)
  preferredDayOfWeek Int?              // Day most active (0-6)

  // Engagement Patterns
  avgTimeToConvert Int?               // Seconds from start to purchase
  avgSessionDuration Int?             // Seconds
  avgScrollDepth   Float?             // 0-1
  avgPagesPerSession Float?

  // Product Preferences
  viewedCategories Json?              // { category: viewCount }
  purchasedCategories Json?           // { category: purchaseCount }
  priceRangePref  String?             // 'budget' | 'mid' | 'premium'

  // Conversion Signals (What works for this visitor)
  respondsToDiscounts Boolean @default(false)
  respondsToUrgency Boolean @default(false)
  respondsToSocialProof Boolean @default(false)
  respondsToPriceAnchor Boolean @default(false)

  // Risk Assessment
  abandonmentRate  Float    @default(0)  // Historical (0-1)
  avgAbandonStage  Float?               // Where they usually drop (stage order)
  lastAbandonReason String?             // Most recent abandon reason

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  sessions        FunnelSession[]

  @@index([email])
  @@index([customerId])
  @@index([visitorFingerprint])
}
```

### Extended FunnelEvent Types

```prisma
enum FunnelEventType {
  // Stage Navigation (Existing)
  STAGE_ENTERED
  STAGE_COMPLETED
  STAGE_ABANDONED
  PAYMENT_COMPLETED

  // NEW: Micro-behavioral Events
  SCROLL_DEPTH              // { depth: 50, section?: 'testimonials' }
  TIME_ON_PAGE              // { seconds: 45, active: true }
  SECTION_VIEW              // { sectionId, duration }
  SECTION_EXIT              // { sectionId, duration }

  // NEW: Product Interaction
  PRODUCT_VIEW              // { productId, duration }
  PRODUCT_HOVER             // { productId, duration }
  PRODUCT_ADDED             // { productId, quantity, source }
  PRODUCT_REMOVED           // { productId, quantity }
  QUANTITY_CHANGED          // { productId, from, to }

  // NEW: Form Interaction
  FORM_FOCUS                // { field, stageOrder }
  FORM_BLUR                 // { field, hasValue, duration }
  FORM_ERROR                // { field, error, attempts }
  FORM_CORRECTION           // { field, correctionType }

  // NEW: Payment Interaction
  PAYMENT_METHOD_VIEWED     // { method }
  PAYMENT_METHOD_SELECTED   // { method }
  PAYMENT_STARTED           // { method, amount }
  PAYMENT_FAILED            // { method, error, declineCode }
  PAYMENT_RETRY             // { method, attempt }

  // NEW: Engagement Signals
  EXIT_INTENT               // { position, velocity }
  TAB_HIDDEN                // { timestamp }
  TAB_VISIBLE               // { hiddenFor }
  IDLE_START                // { afterSeconds }
  IDLE_END                  // { idleFor }
  BACK_BUTTON               // { fromStage, toStage }

  // NEW: Conversion Helpers
  COUPON_APPLIED            // { code, discount }
  COUPON_FAILED             // { code, reason }
  COUPON_REMOVED            // { code }
  UPSELL_SHOWN              // { offerId, products }
  UPSELL_ACCEPTED           // { offerId, addedValue }
  UPSELL_DECLINED           // { offerId }

  // NEW: MI Interventions
  INTERVENTION_TRIGGERED    // { type, reason, scores }
  INTERVENTION_SHOWN        // { type, content }
  INTERVENTION_ENGAGED      // { type, action }
  INTERVENTION_DISMISSED    // { type, dismissReason }

  // NEW: Visitor Recognition
  VISITOR_RECOGNIZED        // { profileId, method }
  VISITOR_MERGED            // { fromProfileId, toProfileId }
  EMAIL_CAPTURED            // { email, isExisting }
}
```

---

## Real-time Score Storage (Redis)

### Key Structure

```typescript
// Session scores (real-time, expires with session)
// Key: `funnel:session:{sessionToken}:scores`
// TTL: 2 hours

interface SessionScores {
  sessionToken: string;
  funnelId: string;
  currentStage: number;

  // Composite Scores (0-1)
  engagementScore: number;
  abandonmentRisk: number;
  purchaseIntent: number;

  // Component Scores
  scrollScore: number;         // Based on scroll depth
  timeScore: number;           // Based on time on page
  interactionScore: number;    // Based on clicks, hovers
  progressScore: number;       // Based on funnel progress

  // Risk Signals
  idleSignal: number;          // Idle time contribution
  exitIntentSignal: number;    // Exit intent detected
  tabSwitchSignal: number;     // Tab switching behavior
  errorSignal: number;         // Form errors encountered
  backButtonSignal: number;    // Back navigation

  // Intervention State
  lastInterventionType?: string;
  lastInterventionAt?: Date;
  interventionCount: number;
  recommendedIntervention?: string;
  interventionPriority: number;

  // Timestamps
  lastUpdated: Date;
  sessionStarted: Date;
}

// Visitor profile cache (for quick lookups)
// Key: `funnel:visitor:{fingerprint}:profile`
// TTL: 30 days

interface CachedVisitorProfile {
  profileId: string;
  respondsToDiscounts: boolean;
  respondsToUrgency: boolean;
  abandonmentRate: number;
  avgAbandonStage: number;
}

// Active funnel stats (for live dashboard)
// Key: `funnel:{funnelId}:live:stats`
// TTL: 24 hours (reset daily)

interface LiveFunnelStats {
  activeVisitors: number;
  todayVisits: number;
  todayConversions: number;
  todayRevenue: number;
  avgEngagement: number;
  avgTimeOnSite: number;
}
```

---

## Frontend Tracking SDK

### useMITracker Hook

```typescript
// hooks/useMITracker.ts

import { useRef, useEffect, useCallback } from 'react';

interface MITrackerConfig {
  sessionToken: string;
  funnelId: string;
  apiUrl: string;

  // Configuration
  batchInterval?: number;        // ms between sends (default: 3000)
  scrollThresholds?: number[];   // (default: [10, 25, 50, 75, 90, 100])
  idleTimeout?: number;          // ms before idle (default: 30000)
  heartbeatInterval?: number;    // ms for time tracking (default: 5000)
  exitIntentThreshold?: number;  // px from top for exit intent (default: 50)
}

interface MIEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function useMITracker(config: MITrackerConfig) {
  const eventQueue = useRef<MIEvent[]>([]);
  const scores = useRef<SessionScores | null>(null);
  const isIdle = useRef(false);
  const idleTimer = useRef<NodeJS.Timeout>();
  const scrollDepthReached = useRef<Set<number>>(new Set());
  const sectionTimers = useRef<Map<string, number>>(new Map());

  // ═══════════════════════════════════════════════════════════════
  // AUTOMATIC TRACKING SETUP
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    const cleanup: (() => void)[] = [];

    // 1. Scroll depth tracking
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      const thresholds = config.scrollThresholds || [10, 25, 50, 75, 90, 100];
      for (const threshold of thresholds) {
        if (scrollPercent >= threshold && !scrollDepthReached.current.has(threshold)) {
          scrollDepthReached.current.add(threshold);
          queueEvent('SCROLL_DEPTH', { depth: threshold });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    cleanup.push(() => window.removeEventListener('scroll', handleScroll));

    // 2. Visibility tracking
    const handleVisibility = () => {
      if (document.hidden) {
        queueEvent('TAB_HIDDEN', { timestamp: Date.now() });
      } else {
        queueEvent('TAB_VISIBLE', { timestamp: Date.now() });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    cleanup.push(() => document.removeEventListener('visibilitychange', handleVisibility));

    // 3. Exit intent tracking
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < (config.exitIntentThreshold || 50)) {
        queueEvent('EXIT_INTENT', {
          position: { x: e.clientX, y: e.clientY },
          velocity: e.movementY,
        });
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    cleanup.push(() => document.removeEventListener('mouseleave', handleMouseLeave));

    // 4. Idle detection
    const resetIdleTimer = () => {
      if (isIdle.current) {
        isIdle.current = false;
        queueEvent('IDLE_END', { idleFor: Date.now() - (idleTimer.current as any) });
      }
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        isIdle.current = true;
        queueEvent('IDLE_START', { afterSeconds: (config.idleTimeout || 30000) / 1000 });
      }, config.idleTimeout || 30000);
    };
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
      cleanup.push(() => document.removeEventListener(event, resetIdleTimer));
    });
    resetIdleTimer();

    // 5. Heartbeat for time tracking
    const heartbeat = setInterval(() => {
      if (!document.hidden && !isIdle.current) {
        queueEvent('TIME_ON_PAGE', {
          seconds: (config.heartbeatInterval || 5000) / 1000,
          active: true,
        });
      }
    }, config.heartbeatInterval || 5000);
    cleanup.push(() => clearInterval(heartbeat));

    // 6. Batch sender
    const batchSender = setInterval(() => {
      flushEvents();
    }, config.batchInterval || 3000);
    cleanup.push(() => clearInterval(batchSender));

    // 7. Send on page unload
    const handleUnload = () => {
      flushEvents(true); // Sync send
    };
    window.addEventListener('beforeunload', handleUnload);
    cleanup.push(() => window.removeEventListener('beforeunload', handleUnload));

    return () => cleanup.forEach(fn => fn());
  }, [config]);

  // ═══════════════════════════════════════════════════════════════
  // EVENT QUEUEING & SENDING
  // ═══════════════════════════════════════════════════════════════

  const queueEvent = useCallback((type: string, data: Record<string, unknown>) => {
    eventQueue.current.push({
      type,
      data,
      timestamp: Date.now(),
    });
  }, []);

  const flushEvents = useCallback(async (sync = false) => {
    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    const payload = {
      sessionToken: config.sessionToken,
      events,
    };

    if (sync) {
      // Use sendBeacon for reliability on page unload
      navigator.sendBeacon(
        `${config.apiUrl}/funnels/sessions/${config.sessionToken}/events/batch`,
        JSON.stringify(payload)
      );
    } else {
      try {
        const response = await fetch(
          `${config.apiUrl}/funnels/sessions/${config.sessionToken}/events/batch`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const data = await response.json();
          scores.current = data.scores;
        }
      } catch (error) {
        // Re-queue events on failure
        eventQueue.current = [...events, ...eventQueue.current];
      }
    }
  }, [config]);

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track a custom event
   */
  const track = useCallback((type: string, data: Record<string, unknown> = {}) => {
    queueEvent(type, data);
  }, [queueEvent]);

  /**
   * Track product view with automatic duration
   */
  const trackProductView = useCallback((productId: string) => {
    const startTime = Date.now();
    return () => {
      queueEvent('PRODUCT_VIEW', {
        productId,
        duration: Date.now() - startTime,
      });
    };
  }, [queueEvent]);

  /**
   * Track section view with automatic duration
   */
  const trackSectionView = useCallback((sectionId: string) => {
    sectionTimers.current.set(sectionId, Date.now());
    queueEvent('SECTION_VIEW', { sectionId });

    return () => {
      const startTime = sectionTimers.current.get(sectionId);
      if (startTime) {
        queueEvent('SECTION_EXIT', {
          sectionId,
          duration: Date.now() - startTime,
        });
        sectionTimers.current.delete(sectionId);
      }
    };
  }, [queueEvent]);

  /**
   * Track form field interaction
   */
  const trackFormField = useCallback((fieldName: string, fieldGroup: string) => {
    let focusTime: number;

    return {
      onFocus: () => {
        focusTime = Date.now();
        queueEvent('FORM_FOCUS', { field: fieldName, group: fieldGroup });
      },
      onBlur: (hasValue: boolean, isValid?: boolean) => {
        queueEvent('FORM_BLUR', {
          field: fieldName,
          group: fieldGroup,
          hasValue,
          isValid,
          duration: Date.now() - focusTime,
        });
      },
      onError: (error: string) => {
        queueEvent('FORM_ERROR', {
          field: fieldName,
          group: fieldGroup,
          error,
        });
      },
    };
  }, [queueEvent]);

  /**
   * Get current scores (for conditional rendering)
   */
  const getScores = useCallback(() => scores.current, []);

  /**
   * Check if specific intervention should show
   */
  const shouldShowIntervention = useCallback((type: string) => {
    if (!scores.current) return false;
    return scores.current.recommendedIntervention === type;
  }, []);

  /**
   * Record intervention shown
   */
  const recordIntervention = useCallback((type: string, content: Record<string, unknown>) => {
    queueEvent('INTERVENTION_SHOWN', { type, content });
  }, [queueEvent]);

  /**
   * Record intervention engagement
   */
  const recordInterventionEngagement = useCallback((type: string, action: string) => {
    queueEvent('INTERVENTION_ENGAGED', { type, action });
  }, [queueEvent]);

  return {
    track,
    trackProductView,
    trackSectionView,
    trackFormField,
    getScores,
    shouldShowIntervention,
    recordIntervention,
    recordInterventionEngagement,
    flushEvents,
  };
}
```

### Usage Example

```tsx
// In checkout-stage.tsx

function CheckoutStage({ stage, funnel }: CheckoutStageProps) {
  const { sessionToken } = useFunnel();
  const miTracker = useMITracker({
    sessionToken,
    funnelId: funnel.id,
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  });

  // Track form fields
  const emailField = miTracker.trackFormField('email', 'customer');
  const cardField = miTracker.trackFormField('card_number', 'payment');

  // Check for interventions
  const showExitIntent = miTracker.shouldShowIntervention('EXIT_INTENT_POPUP');

  return (
    <form>
      <input
        type="email"
        name="email"
        onFocus={emailField.onFocus}
        onBlur={(e) => emailField.onBlur(!!e.target.value, isValidEmail(e.target.value))}
      />

      {/* Credit card field */}
      <input
        type="text"
        name="card"
        onFocus={cardField.onFocus}
        onBlur={(e) => cardField.onBlur(!!e.target.value)}
      />

      {/* Exit intent popup */}
      {showExitIntent && (
        <ExitIntentPopup
          onShow={() => miTracker.recordIntervention('EXIT_INTENT_POPUP', { discount: 10 })}
          onEngage={(action) => miTracker.recordInterventionEngagement('EXIT_INTENT_POPUP', action)}
        />
      )}
    </form>
  );
}
```

---

## Backend Scoring Service

### MIFunnelScoringService

```typescript
@Injectable()
export class MIFunnelScoringService {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  /**
   * Calculate all scores for a session
   */
  async calculateScores(sessionToken: string, events: FunnelEvent[]): Promise<SessionScores> {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken },
      include: { funnel: { include: { stages: true } } },
    });

    const existingScores = await this.getScores(sessionToken);

    // Calculate component scores
    const scrollScore = this.calculateScrollScore(events);
    const timeScore = this.calculateTimeScore(events, existingScores);
    const interactionScore = this.calculateInteractionScore(events);
    const progressScore = this.calculateProgressScore(session);

    // Calculate risk signals
    const idleSignal = this.calculateIdleSignal(events);
    const exitIntentSignal = this.calculateExitIntentSignal(events);
    const tabSwitchSignal = this.calculateTabSwitchSignal(events);
    const errorSignal = this.calculateErrorSignal(events);
    const backButtonSignal = this.calculateBackButtonSignal(events);

    // Composite scores (weighted averages)
    const engagementScore = this.calculateEngagementScore({
      scrollScore,
      timeScore,
      interactionScore,
      progressScore,
    });

    const abandonmentRisk = this.calculateAbandonmentRisk({
      idleSignal,
      exitIntentSignal,
      tabSwitchSignal,
      errorSignal,
      backButtonSignal,
      progressScore,
    });

    const purchaseIntent = this.calculatePurchaseIntent(session, {
      engagementScore,
      progressScore,
      interactionScore,
    });

    // Determine recommended intervention
    const recommendedIntervention = this.selectIntervention({
      engagementScore,
      abandonmentRisk,
      purchaseIntent,
      existingScores,
    });

    const scores: SessionScores = {
      sessionToken,
      funnelId: session.funnelId,
      currentStage: session.currentStageOrder,
      engagementScore,
      abandonmentRisk,
      purchaseIntent,
      scrollScore,
      timeScore,
      interactionScore,
      progressScore,
      idleSignal,
      exitIntentSignal,
      tabSwitchSignal,
      errorSignal,
      backButtonSignal,
      lastInterventionType: existingScores?.lastInterventionType,
      lastInterventionAt: existingScores?.lastInterventionAt,
      interventionCount: existingScores?.interventionCount || 0,
      recommendedIntervention,
      interventionPriority: this.calculateInterventionPriority(abandonmentRisk, purchaseIntent),
      lastUpdated: new Date(),
      sessionStarted: session.createdAt,
    };

    // Store in Redis
    await this.redis.setex(
      `funnel:session:${sessionToken}:scores`,
      7200, // 2 hours TTL
      JSON.stringify(scores)
    );

    return scores;
  }

  /**
   * Calculate engagement score (0-1)
   * Higher = more engaged visitor
   */
  private calculateEngagementScore(components: {
    scrollScore: number;
    timeScore: number;
    interactionScore: number;
    progressScore: number;
  }): number {
    const weights = {
      scroll: 0.2,
      time: 0.25,
      interaction: 0.3,
      progress: 0.25,
    };

    return (
      components.scrollScore * weights.scroll +
      components.timeScore * weights.time +
      components.interactionScore * weights.interaction +
      components.progressScore * weights.progress
    );
  }

  /**
   * Calculate abandonment risk (0-1)
   * Higher = more likely to abandon
   */
  private calculateAbandonmentRisk(signals: {
    idleSignal: number;
    exitIntentSignal: number;
    tabSwitchSignal: number;
    errorSignal: number;
    backButtonSignal: number;
    progressScore: number;
  }): number {
    // Weight signals
    let risk = 0;
    risk += signals.idleSignal * 0.2;
    risk += signals.exitIntentSignal * 0.25;
    risk += signals.tabSwitchSignal * 0.15;
    risk += signals.errorSignal * 0.25;
    risk += signals.backButtonSignal * 0.15;

    // Progress reduces risk slightly (invested visitors less likely to leave)
    risk *= (1 - signals.progressScore * 0.3);

    return Math.min(1, Math.max(0, risk));
  }

  /**
   * Calculate purchase intent (0-1)
   * Higher = more likely to purchase
   */
  private calculatePurchaseIntent(
    session: FunnelSession,
    components: {
      engagementScore: number;
      progressScore: number;
      interactionScore: number;
    }
  ): number {
    let intent = 0;

    // Base on progress (reaching checkout = high intent)
    intent += components.progressScore * 0.4;

    // Engagement contributes
    intent += components.engagementScore * 0.2;

    // Having items in cart is strong signal
    const cartItems = (session.selectedProducts as any[])?.length || 0;
    if (cartItems > 0) {
      intent += 0.2;
      if (cartItems > 2) intent += 0.1;
    }

    // Interaction with products
    intent += components.interactionScore * 0.1;

    return Math.min(1, Math.max(0, intent));
  }

  /**
   * Select recommended intervention based on scores
   */
  private selectIntervention(data: {
    engagementScore: number;
    abandonmentRisk: number;
    purchaseIntent: number;
    existingScores: SessionScores | null;
  }): string | undefined {
    // Don't recommend if recent intervention
    if (data.existingScores?.lastInterventionAt) {
      const minutesSince = (Date.now() - new Date(data.existingScores.lastInterventionAt).getTime()) / 60000;
      if (minutesSince < 2) return undefined;
    }

    // High abandonment risk + decent purchase intent = save them
    if (data.abandonmentRisk > 0.7 && data.purchaseIntent > 0.4) {
      return 'EXIT_INTENT_POPUP';
    }

    // Low engagement, might need help
    if (data.engagementScore < 0.3 && data.abandonmentRisk > 0.5) {
      return 'HELP_NUDGE';
    }

    // High intent, ready for upsell
    if (data.purchaseIntent > 0.8 && data.engagementScore > 0.6) {
      return 'UPSELL_OFFER';
    }

    // Social proof for hesitant visitors
    if (data.abandonmentRisk > 0.5 && data.abandonmentRisk < 0.7) {
      return 'SOCIAL_PROOF_TOAST';
    }

    return undefined;
  }

  // Component score calculations...

  private calculateScrollScore(events: FunnelEvent[]): number {
    const scrollEvents = events.filter(e => e.type === 'SCROLL_DEPTH');
    if (scrollEvents.length === 0) return 0;

    const maxDepth = Math.max(...scrollEvents.map(e => (e.data as any).depth || 0));
    return maxDepth / 100;
  }

  private calculateTimeScore(events: FunnelEvent[], existing: SessionScores | null): number {
    const timeEvents = events.filter(e => e.type === 'TIME_ON_PAGE');
    const newSeconds = timeEvents.reduce((sum, e) => sum + ((e.data as any).seconds || 0), 0);

    const existingTimeScore = existing?.timeScore || 0;
    const existingSeconds = existingTimeScore * 300; // Assume 5min = 1.0

    const totalSeconds = existingSeconds + newSeconds;

    // Score: 30s = 0.1, 60s = 0.3, 120s = 0.6, 300s+ = 1.0
    return Math.min(1, totalSeconds / 300);
  }

  private calculateInteractionScore(events: FunnelEvent[]): number {
    const interactions = events.filter(e =>
      ['PRODUCT_VIEW', 'PRODUCT_ADDED', 'FORM_FOCUS', 'SECTION_VIEW'].includes(e.type)
    );

    // Score based on number and variety of interactions
    const uniqueTypes = new Set(interactions.map(e => e.type)).size;
    const count = interactions.length;

    return Math.min(1, (count / 10) * 0.5 + (uniqueTypes / 4) * 0.5);
  }

  private calculateProgressScore(session: FunnelSession): number {
    const totalStages = session.funnel.stages.length;
    const currentStage = session.currentStageOrder;

    return (currentStage + 1) / totalStages;
  }

  private calculateIdleSignal(events: FunnelEvent[]): number {
    const idleEvents = events.filter(e => e.type === 'IDLE_START');
    return Math.min(1, idleEvents.length * 0.3);
  }

  private calculateExitIntentSignal(events: FunnelEvent[]): number {
    const exitEvents = events.filter(e => e.type === 'EXIT_INTENT');
    return Math.min(1, exitEvents.length * 0.4);
  }

  private calculateTabSwitchSignal(events: FunnelEvent[]): number {
    const tabEvents = events.filter(e => e.type === 'TAB_HIDDEN');
    return Math.min(1, tabEvents.length * 0.2);
  }

  private calculateErrorSignal(events: FunnelEvent[]): number {
    const errorEvents = events.filter(e => e.type === 'FORM_ERROR');
    return Math.min(1, errorEvents.length * 0.25);
  }

  private calculateBackButtonSignal(events: FunnelEvent[]): number {
    const backEvents = events.filter(e => e.type === 'BACK_BUTTON');
    return Math.min(1, backEvents.length * 0.3);
  }

  private calculateInterventionPriority(abandonmentRisk: number, purchaseIntent: number): number {
    // Priority = how urgently we need to intervene
    // High risk + high intent = urgent (we can save them!)
    return abandonmentRisk * purchaseIntent * 100;
  }

  async getScores(sessionToken: string): Promise<SessionScores | null> {
    const data = await this.redis.get(`funnel:session:${sessionToken}:scores`);
    return data ? JSON.parse(data) : null;
  }
}
```

---

## Intervention Types

| Type | Trigger Condition | Content |
|------|-------------------|---------|
| `EXIT_INTENT_POPUP` | abandonmentRisk > 0.7, purchaseIntent > 0.4 | Discount offer, cart reminder |
| `HELP_NUDGE` | engagement < 0.3, abandonmentRisk > 0.5 | "Need help?" chat trigger |
| `SOCIAL_PROOF_TOAST` | abandonmentRisk 0.5-0.7 | "Sarah just purchased..." |
| `URGENCY_BANNER` | purchaseIntent > 0.6, on checkout | "Only 3 left in stock" |
| `UPSELL_OFFER` | purchaseIntent > 0.8, engagement > 0.6 | Complementary product |
| `PAYMENT_ALTERNATIVE` | formErrors on payment > 2 | "Try PayPal instead" |

---

## API Endpoints

```typescript
// Batch event ingestion
POST /api/funnels/sessions/:sessionToken/events/batch
Body: { events: FunnelEvent[] }
Response: { success: true, scores: SessionScores }

// Get current scores
GET /api/funnels/sessions/:sessionToken/scores
Response: SessionScores

// Get recommended intervention
GET /api/funnels/sessions/:sessionToken/intervention
Response: { type: string, content: InterventionContent } | null

// Record intervention result
POST /api/funnels/sessions/:sessionToken/intervention
Body: { type: string, outcome: 'engaged' | 'dismissed' | 'converted' }
```

---

*Document Version: 1.0*
*Created: December 7, 2025*
