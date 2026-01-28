# Momentum Intelligence + Cart Integration Specification

## Executive Summary

This specification details the integration of Momentum Intelligence (MI) capabilities with the cart and shopping experience to create an AI-powered, behaviorally-optimized checkout flow that maximizes conversion and revenue recovery.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Abandoned Cart Save Flow](#2-abandoned-cart-save-flow)
3. [Behavioral Triggers in Cart UI](#3-behavioral-triggers-in-cart-ui)
4. [AI-Powered Upsell Engine](#4-ai-powered-upsell-engine)
5. [Checkout Churn Detection](#5-checkout-churn-detection)
6. [CS AI Chat Integration](#6-cs-ai-chat-integration)
7. [Voice AI Cart Recovery](#7-voice-ai-cart-recovery)
8. [AI-Generated Recovery Content](#8-ai-generated-recovery-content)
9. [Analytics Dashboard](#9-analytics-dashboard)
10. [Database Schema](#10-database-schema)
11. [API Endpoints](#11-api-endpoints)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Overview

### Current State

| Component | Status | MI Integration |
|-----------|--------|----------------|
| Cart Module | ✅ Complete | None |
| Cart Abandonment Service | ✅ Complete | Basic email only |
| MI Save Flow | ✅ Complete | Subscription-focused |
| MI Behavioral Triggers | ✅ Complete | Content generation only |
| MI Upsell Engine | ✅ Complete | Post-purchase focused |
| MI Voice AI | ✅ Complete | Customer service only |
| MI CS AI | ✅ Complete | Support tickets only |

### Target State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MI-POWERED CART EXPERIENCE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   BROWSE    │───▶│    CART     │───▶│  CHECKOUT   │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│        │                  │                  │                           │
│        ▼                  ▼                  ▼                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ AI Upsell   │    │ Behavioral  │    │ CS AI Chat  │                  │
│  │ Recommend   │    │ Triggers    │    │ + Churn     │                  │
│  └─────────────┘    └─────────────┘    │ Detection   │                  │
│                           │            └─────────────┘                  │
│                           ▼                                              │
│                    ┌─────────────┐                                       │
│                    │ ABANDONMENT │                                       │
│                    └──────┬──────┘                                       │
│                           │                                              │
│        ┌──────────────────┼──────────────────┐                          │
│        ▼                  ▼                  ▼                           │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                      │
│  │   EMAIL   │     │    SMS    │     │ VOICE AI  │                      │
│  │ Save Flow │     │ Save Flow │     │   Call    │                      │
│  └───────────┘     └───────────┘     └───────────┘                      │
│        │                  │                  │                           │
│        └──────────────────┴──────────────────┘                          │
│                           │                                              │
│                           ▼                                              │
│                    ┌─────────────┐                                       │
│                    │  RECOVERED  │                                       │
│                    │   ORDER     │                                       │
│                    └─────────────┘                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Cart abandonment rate | ~70% | 55% | (Abandoned / Total) × 100 |
| Recovery rate | ~5% | 20% | (Recovered / Abandoned) × 100 |
| Avg cart value | $45 | $58 | Total revenue / Orders |
| Upsell acceptance | N/A | 15% | Upsells accepted / Presented |
| Checkout completion | ~30% | 45% | Orders / Checkout starts |

---

## 2. Abandoned Cart Save Flow

### Overview

Extend the existing 7-stage `CustomerSaveService` to handle cart abandonment with cart-specific interventions.

### Cart Save Flow Stages

```typescript
enum CartSaveStage {
  // Immediate (0-30 minutes)
  BROWSE_REMINDER = 'BROWSE_REMINDER',        // "Still shopping?"

  // Early (30 min - 2 hours)
  PATTERN_INTERRUPT = 'PATTERN_INTERRUPT',    // Show cart contents + value

  // Diagnosis (2-6 hours)
  DIAGNOSIS_SURVEY = 'DIAGNOSIS_SURVEY',      // "What's holding you back?"

  // Intervention (6-24 hours)
  BRANCHING_INTERVENTION = 'BRANCHING_INTERVENTION', // Based on diagnosis

  // Escalation (24-48 hours)
  NUCLEAR_OFFER = 'NUCLEAR_OFFER',            // Best offer + urgency

  // Recovery (48-72 hours)
  LOSS_VISUALIZATION = 'LOSS_VISUALIZATION',  // Show what they'll miss

  // Final (72+ hours)
  WINBACK_SEQUENCE = 'WINBACK_SEQUENCE',      // Multi-touch drip campaign
}
```

### Timing Configuration

```typescript
interface CartSaveFlowConfig {
  stages: {
    browseReminder: {
      enabled: boolean;
      delayMinutes: number;      // Default: 15
      channel: 'IN_APP' | 'PUSH';
    };
    patternInterrupt: {
      enabled: boolean;
      delayMinutes: number;      // Default: 60
      channels: ('EMAIL' | 'SMS' | 'PUSH')[];
    };
    diagnosisSurvey: {
      enabled: boolean;
      delayMinutes: number;      // Default: 180 (3 hours)
      channels: ('EMAIL' | 'SMS')[];
    };
    branchingIntervention: {
      enabled: boolean;
      delayMinutes: number;      // Default: 360 (6 hours)
      maxDiscountPercent: number; // Default: 15
      freeShippingThreshold: number | null;
    };
    nuclearOffer: {
      enabled: boolean;
      delayMinutes: number;      // Default: 1440 (24 hours)
      maxDiscountPercent: number; // Default: 30
      includeGift: boolean;
      voiceCallEnabled: boolean;
      minCartValueForVoice: number; // Default: 100
    };
    lossVisualization: {
      enabled: boolean;
      delayMinutes: number;      // Default: 2880 (48 hours)
    };
    winbackSequence: {
      enabled: boolean;
      delayMinutes: number;      // Default: 4320 (72 hours)
      sequenceLength: number;    // Default: 5 emails over 14 days
    };
  };

  // Global settings
  maxAttemptsPerCart: number;     // Default: 10
  respectUnsubscribe: boolean;    // Default: true
  blackoutHours: { start: number; end: number }; // e.g., 22:00-08:00
}
```

### Diagnosis Branches

```typescript
interface CartDiagnosisBranch {
  reason: CartAbandonmentReason;
  interventions: CartIntervention[];
}

enum CartAbandonmentReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  SHIPPING_COST = 'SHIPPING_COST',
  JUST_BROWSING = 'JUST_BROWSING',
  NEED_MORE_INFO = 'NEED_MORE_INFO',
  PAYMENT_ISSUES = 'PAYMENT_ISSUES',
  COMPARING_OPTIONS = 'COMPARING_OPTIONS',
  SAVING_FOR_LATER = 'SAVING_FOR_LATER',
  OTHER = 'OTHER',
}

const DIAGNOSIS_BRANCHES: CartDiagnosisBranch[] = [
  {
    reason: 'TOO_EXPENSIVE',
    interventions: [
      { type: 'PERCENTAGE_DISCOUNT', value: 10, message: "Here's 10% off your order" },
      { type: 'PAYMENT_PLAN', message: "Split into 4 payments with Affirm" },
      { type: 'BUDGET_ALTERNATIVE', message: "Try our value collection" },
    ],
  },
  {
    reason: 'SHIPPING_COST',
    interventions: [
      { type: 'FREE_SHIPPING', message: "Free shipping on your order!" },
      { type: 'THRESHOLD_REMINDER', value: 15, message: "Add $15 for free shipping" },
      { type: 'LOCAL_PICKUP', message: "Free local pickup available" },
    ],
  },
  {
    reason: 'NEED_MORE_INFO',
    interventions: [
      { type: 'PRODUCT_FAQ', message: "Here are answers to common questions" },
      { type: 'REVIEWS_SHOWCASE', message: "See what 2,847 customers say" },
      { type: 'VIDEO_DEMO', message: "Watch our product in action" },
      { type: 'LIVE_CHAT', message: "Chat with our team now" },
    ],
  },
  {
    reason: 'COMPARING_OPTIONS',
    interventions: [
      { type: 'COMPARISON_CHART', message: "See how we compare" },
      { type: 'PRICE_MATCH', message: "Found it cheaper? We'll match it" },
      { type: 'UNIQUE_VALUE', message: "Why customers choose us" },
    ],
  },
  {
    reason: 'SAVING_FOR_LATER',
    interventions: [
      { type: 'WISHLIST_SAVE', message: "We saved your cart for you" },
      { type: 'PRICE_DROP_ALERT', message: "Get notified if prices drop" },
      { type: 'RESTOCK_ALERT', message: "We'll let you know if stock is low" },
    ],
  },
];
```

### Save Flow Service Extension

```typescript
// apps/api/src/momentum-intelligence/cart-save/cart-save.service.ts

@Injectable()
export class CartSaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly intentService: IntentDetectionService,
    private readonly contentService: ContentGenerationService,
    private readonly triggerService: TriggerLibraryService,
    private readonly deliveryService: DeliveryService,
    private readonly voiceService: VoiceAIService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Initiate save flow for an abandoned cart
   */
  async initiateCartSaveFlow(
    cartId: string,
    reason?: CartAbandonmentReason,
  ): Promise<CartSaveAttempt> {
    const cart = await this.getCartWithCustomer(cartId);

    // Check if already in save flow
    const existingAttempt = await this.getActiveAttempt(cartId);
    if (existingAttempt) {
      return existingAttempt;
    }

    // Calculate customer value for prioritization
    const customerIntent = await this.intentService.getCustomerIntent(
      cart.customerId,
      cart.companyId,
    );

    // Determine starting stage based on context
    const startStage = this.determineStartStage(cart, customerIntent);

    // Create save attempt
    const attempt = await this.prisma.cartSaveAttempt.create({
      data: {
        cartId,
        companyId: cart.companyId,
        customerId: cart.customerId,
        currentStage: startStage,
        diagnosisReason: reason,
        customerRiskScore: customerIntent?.churnRisk?.score || 0,
        cartValue: cart.grandTotal,
        metadata: {
          itemCount: cart.itemCount,
          hasHighValueItems: this.hasHighValueItems(cart),
          customerLTV: customerIntent?.lifetimeValue || 0,
        },
      },
    });

    // Schedule first intervention
    await this.scheduleNextIntervention(attempt);

    return attempt;
  }

  /**
   * Progress to next stage based on customer response
   */
  async progressCartSaveFlow(
    attemptId: string,
    response?: CartSaveResponse,
  ): Promise<CartSaveAttempt> {
    const attempt = await this.prisma.cartSaveAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { cart: true, interventions: true },
    });

    // Record response
    if (response) {
      await this.recordResponse(attemptId, response);
    }

    // Check if cart was converted
    if (attempt.cart.status === 'CONVERTED') {
      return this.completeSaveFlow(attemptId, 'CONVERTED');
    }

    // Determine next stage
    const nextStage = this.getNextStage(attempt, response);

    if (!nextStage) {
      return this.completeSaveFlow(attemptId, 'EXHAUSTED');
    }

    // Update attempt
    const updated = await this.prisma.cartSaveAttempt.update({
      where: { id: attemptId },
      data: {
        currentStage: nextStage,
        stageHistory: {
          push: {
            stage: nextStage,
            enteredAt: new Date().toISOString(),
            previousStage: attempt.currentStage,
          },
        },
      },
    });

    // Schedule intervention for new stage
    await this.scheduleNextIntervention(updated);

    return updated;
  }

  /**
   * Execute intervention for current stage
   */
  async executeIntervention(attemptId: string): Promise<CartIntervention> {
    const attempt = await this.prisma.cartSaveAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { cart: { include: { items: true, customer: true } } },
    });

    const config = await this.getFlowConfig(attempt.companyId);
    const stageConfig = config.stages[this.stageToConfigKey(attempt.currentStage)];

    // Generate content with behavioral triggers
    const content = await this.generateInterventionContent(attempt, stageConfig);

    // Determine channel(s)
    const channels = this.selectChannels(attempt, stageConfig);

    // Create intervention record
    const intervention = await this.prisma.cartIntervention.create({
      data: {
        cartSaveAttemptId: attemptId,
        cartId: attempt.cartId,
        stage: attempt.currentStage,
        channels,
        content,
        triggersUsed: content.triggersApplied,
        scheduledAt: new Date(),
      },
    });

    // Deliver via each channel
    for (const channel of channels) {
      await this.deliverIntervention(intervention, channel, attempt);
    }

    return intervention;
  }

  /**
   * Generate personalized intervention content
   */
  private async generateInterventionContent(
    attempt: CartSaveAttempt & { cart: Cart & { items: CartItem[]; customer: Customer } },
    stageConfig: StageConfig,
  ): Promise<InterventionContent> {
    const { cart, diagnosisReason } = attempt;

    // Get applicable triggers
    const triggers = await this.triggerService.getTriggersByContext({
      context: 'CART_RECOVERY',
      stage: attempt.currentStage,
      customerData: {
        tenure: this.calculateTenure(cart.customer),
        ltv: attempt.metadata.customerLTV,
        cartValue: Number(cart.grandTotal),
      },
    });

    // Generate content via AI
    const generated = await this.contentService.generateContent({
      type: 'EMAIL_SEQUENCE',
      context: {
        customerName: cart.customer?.firstName || 'there',
        cartItems: cart.items.map(i => ({
          name: i.productSnapshot.name,
          price: Number(i.unitPrice),
          imageUrl: i.productSnapshot.imageUrl,
        })),
        cartTotal: Number(cart.grandTotal),
        abandonmentReason: diagnosisReason,
        stage: attempt.currentStage,
      },
      style: {
        brandVoice: 'friendly',
        emotionalTone: this.getToneForStage(attempt.currentStage),
        urgencyLevel: this.getUrgencyForStage(attempt.currentStage),
      },
      triggers: triggers.slice(0, 3).map(t => t.id),
    });

    // Apply offer if applicable
    const offer = this.getOfferForStage(attempt, stageConfig, diagnosisReason);

    return {
      subject: generated.subject,
      headline: generated.headline,
      body: generated.body,
      cta: generated.cta,
      offer,
      triggersApplied: triggers.map(t => t.id),
      recoveryUrl: this.generateRecoveryUrl(cart),
    };
  }

  /**
   * Initiate voice call for high-value carts
   */
  async initiateVoiceRecovery(attemptId: string): Promise<VoiceCall> {
    const attempt = await this.prisma.cartSaveAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { cart: { include: { customer: true, items: true } } },
    });

    const { cart } = attempt;

    if (!cart.customer?.phone) {
      throw new BadRequestException('Customer phone not available');
    }

    // Generate voice script
    const script = await this.generateVoiceScript(attempt);

    // Initiate call via Voice AI
    return this.voiceService.initiateOutboundCall({
      customerId: cart.customerId,
      companyId: cart.companyId,
      phone: cart.customer.phone,
      scriptType: 'CART_RECOVERY',
      scriptContent: script,
      context: {
        cartId: cart.id,
        cartValue: Number(cart.grandTotal),
        itemCount: cart.itemCount,
        topItem: cart.items[0]?.productSnapshot.name,
        customerName: cart.customer.firstName,
        offer: attempt.currentOffer,
      },
    });
  }
}
```

---

## 3. Behavioral Triggers in Cart UI

### Overview

Apply MI's 13 behavioral triggers directly in the cart drawer and checkout UI to increase conversion.

### Trigger Placement Map

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cart Drawer                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ ⏱️ Your reserved items expire in 14:32           [URGENCY] │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Your Cart (3 items)                                                 │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [IMG] Signature Blend Coffee                                │    │
│  │       $24.99  ⭐ 4.9 (2,847 reviews)        [SOCIAL PROOF] │    │
│  │       🔥 Only 3 left in stock!              [SCARCITY]     │    │
│  │       [-] 1 [+]                              [Remove]       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🎁 Add $12.01 more for FREE shipping!       [RECIPROCITY]  │    │
│  │ ████████████░░░░ 71% there                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  Subtotal                                              $67.97       │
│  Shipping                                               $5.99       │
│  ─────────────────────────────────────────────────────────────────  │
│  Total                                                 $73.96       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 👥 12 people are viewing these items now   [SOCIAL PROOF]  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [████████████████ Secure Checkout - $73.96 ████████████████]      │
│                                                                      │
│  🔒 Secure checkout  •  30-day returns  •  24/7 support             │
│                                              [AUTHORITY/TRUST]       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Trigger Components

```typescript
// apps/company-portal/src/components/cart/triggers/index.ts

export { UrgencyBanner } from './urgency-banner';
export { ScarcityIndicator } from './scarcity-indicator';
export { SocialProofBadge } from './social-proof-badge';
export { FreeShippingProgress } from './free-shipping-progress';
export { LiveViewersCount } from './live-viewers-count';
export { TrustSignals } from './trust-signals';
export { LossAvertionModal } from './loss-aversion-modal';
export { AnchoringPrice } from './anchoring-price';
```

### Urgency Banner Component

```typescript
// apps/company-portal/src/components/cart/triggers/urgency-banner.tsx

'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface UrgencyBannerProps {
  expiresAt: Date;
  message?: string;
  onExpire?: () => void;
}

export function UrgencyBanner({ expiresAt, message, onExpire }: UrgencyBannerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(expiresAt);
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (timeLeft.total <= 0) return null;

  const urgencyLevel = getUrgencyLevel(timeLeft.total);

  return (
    <div
      className={`
        flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
        ${urgencyLevel === 'critical' ? 'bg-red-500 text-white animate-pulse' : ''}
        ${urgencyLevel === 'high' ? 'bg-orange-500 text-white' : ''}
        ${urgencyLevel === 'medium' ? 'bg-yellow-500 text-yellow-900' : ''}
        ${urgencyLevel === 'low' ? 'bg-blue-100 text-blue-800' : ''}
      `}
    >
      <Clock className="h-4 w-4" />
      <span>
        {message || 'Your reserved items expire in'}{' '}
        <span className="font-mono font-bold">
          {formatTimeLeft(timeLeft)}
        </span>
      </span>
    </div>
  );
}

function calculateTimeLeft(expiresAt: Date) {
  const total = expiresAt.getTime() - Date.now();
  return {
    total,
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function getUrgencyLevel(ms: number): 'critical' | 'high' | 'medium' | 'low' {
  if (ms < 5 * 60 * 1000) return 'critical';  // < 5 min
  if (ms < 15 * 60 * 1000) return 'high';     // < 15 min
  if (ms < 60 * 60 * 1000) return 'medium';   // < 1 hour
  return 'low';
}
```

### Scarcity Indicator Component

```typescript
// apps/company-portal/src/components/cart/triggers/scarcity-indicator.tsx

'use client';

import { Flame, AlertTriangle } from 'lucide-react';

interface ScarcityIndicatorProps {
  stockLevel: number;
  showViewers?: boolean;
  viewersCount?: number;
}

export function ScarcityIndicator({
  stockLevel,
  showViewers = true,
  viewersCount = 0,
}: ScarcityIndicatorProps) {
  if (stockLevel > 10) return null;

  const scarcityLevel = getScarcityLevel(stockLevel);

  return (
    <div className="space-y-1">
      {/* Stock level */}
      <div
        className={`
          flex items-center gap-1.5 text-xs font-medium
          ${scarcityLevel === 'critical' ? 'text-red-600' : ''}
          ${scarcityLevel === 'low' ? 'text-orange-600' : ''}
          ${scarcityLevel === 'medium' ? 'text-yellow-600' : ''}
        `}
      >
        {scarcityLevel === 'critical' ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Flame className="h-3.5 w-3.5" />
        )}
        <span>
          {stockLevel === 1
            ? 'Only 1 left in stock!'
            : `Only ${stockLevel} left in stock!`}
        </span>
      </div>

      {/* Viewers count */}
      {showViewers && viewersCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>{viewersCount} people viewing this now</span>
        </div>
      )}
    </div>
  );
}

function getScarcityLevel(stock: number): 'critical' | 'low' | 'medium' {
  if (stock <= 2) return 'critical';
  if (stock <= 5) return 'low';
  return 'medium';
}
```

### Free Shipping Progress Component

```typescript
// apps/company-portal/src/components/cart/triggers/free-shipping-progress.tsx

'use client';

import { Gift, Truck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FreeShippingProgressProps {
  currentTotal: number;
  threshold: number;
  currency?: string;
}

export function FreeShippingProgress({
  currentTotal,
  threshold,
  currency = 'USD',
}: FreeShippingProgressProps) {
  const remaining = Math.max(0, threshold - currentTotal);
  const progress = Math.min(100, (currentTotal / threshold) * 100);
  const achieved = remaining === 0;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);

  if (achieved) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-800 border border-green-200">
        <Truck className="h-5 w-5" />
        <span className="font-medium">
          You&apos;ve unlocked FREE shipping!
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-5 w-5 text-purple-600" />
        <span className="text-sm font-medium text-purple-900">
          Add <span className="font-bold">{formatPrice(remaining)}</span> more for FREE shipping!
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-purple-600 mt-1">
        {progress.toFixed(0)}% there
      </p>
    </div>
  );
}
```

### Loss Aversion Modal (Remove Item Confirmation)

```typescript
// apps/company-portal/src/components/cart/triggers/loss-aversion-modal.tsx

'use client';

import { useState } from 'react';
import { AlertTriangle, Star, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LossAversionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: {
    name: string;
    price: number;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    savings?: number;
  };
}

export function LossAversionModal({
  open,
  onClose,
  onConfirm,
  item,
}: LossAversionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Remove from cart?
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this item?
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-4">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h4 className="font-medium">{item.name}</h4>

            {item.rating && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{item.rating}</span>
                {item.reviewCount && (
                  <span>({item.reviewCount.toLocaleString()} reviews)</span>
                )}
              </div>
            )}

            {item.savings && item.savings > 0 && (
              <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                <TrendingUp className="h-4 w-4" />
                <span>You&apos;re saving ${item.savings.toFixed(2)}!</span>
              </div>
            )}
          </div>
        </div>

        {/* Loss messaging */}
        <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-800">
          <p className="font-medium mb-1">If you remove this:</p>
          <ul className="list-disc list-inside space-y-1 text-orange-700">
            <li>You may lose your spot (only 3 left!)</li>
            <li>Price may increase when you return</li>
            <li>Your free shipping progress will decrease</li>
          </ul>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Keep in Cart
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={onConfirm}
          >
            Remove Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Trigger Context Provider

```typescript
// apps/company-portal/src/contexts/cart-triggers-context.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCart } from './cart-context';

interface TriggerConfig {
  urgency: {
    enabled: boolean;
    holdDurationMinutes: number;
  };
  scarcity: {
    enabled: boolean;
    showBelowStock: number;
    showViewers: boolean;
  };
  freeShipping: {
    enabled: boolean;
    threshold: number;
  };
  socialProof: {
    enabled: boolean;
    showRatings: boolean;
    showViewers: boolean;
  };
  lossAversion: {
    enabled: boolean;
    showOnRemove: boolean;
  };
}

interface CartTriggersContextValue {
  config: TriggerConfig;
  inventoryLevels: Record<string, number>;
  viewerCounts: Record<string, number>;
  holdExpiry: Date | null;
  refreshInventory: () => Promise<void>;
}

const CartTriggersContext = createContext<CartTriggersContextValue | null>(null);

export function CartTriggersProvider({ children }: { children: ReactNode }) {
  const { cart } = useCart();
  const [config, setConfig] = useState<TriggerConfig | null>(null);
  const [inventoryLevels, setInventoryLevels] = useState<Record<string, number>>({});
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);

  // Fetch trigger config for company
  useEffect(() => {
    if (cart?.companyId) {
      fetchTriggerConfig(cart.companyId).then(setConfig);
    }
  }, [cart?.companyId]);

  // Fetch inventory levels for cart items
  useEffect(() => {
    if (cart?.items.length) {
      const productIds = cart.items.map(i => i.productId);
      fetchInventoryLevels(productIds).then(setInventoryLevels);
    }
  }, [cart?.items]);

  // WebSocket for real-time viewer counts
  useEffect(() => {
    if (!config?.socialProof.showViewers) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/product-viewers`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setViewerCounts(prev => ({
        ...prev,
        [data.productId]: data.viewerCount,
      }));
    };

    // Subscribe to cart products
    cart?.items.forEach(item => {
      ws.send(JSON.stringify({
        action: 'subscribe',
        productId: item.productId,
      }));
    });

    return () => ws.close();
  }, [config?.socialProof.showViewers, cart?.items]);

  // Calculate hold expiry
  useEffect(() => {
    if (cart?.inventoryHolds?.length) {
      const earliestExpiry = cart.inventoryHolds.reduce(
        (earliest, hold) => {
          const expiry = new Date(hold.expiresAt);
          return expiry < earliest ? expiry : earliest;
        },
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );
      setHoldExpiry(earliestExpiry);
    }
  }, [cart?.inventoryHolds]);

  const refreshInventory = async () => {
    if (cart?.items.length) {
      const productIds = cart.items.map(i => i.productId);
      const levels = await fetchInventoryLevels(productIds);
      setInventoryLevels(levels);
    }
  };

  if (!config) return null;

  return (
    <CartTriggersContext.Provider
      value={{
        config,
        inventoryLevels,
        viewerCounts,
        holdExpiry,
        refreshInventory,
      }}
    >
      {children}
    </CartTriggersContext.Provider>
  );
}

export function useCartTriggers() {
  const context = useContext(CartTriggersContext);
  if (!context) {
    throw new Error('useCartTriggers must be used within CartTriggersProvider');
  }
  return context;
}
```

---

## 4. AI-Powered Upsell Engine

### Overview

Leverage MI's `UpsellService` to show intelligent product recommendations in the cart.

### Cart Upsell Types

```typescript
enum CartUpsellType {
  // Pre-checkout
  COMPLEMENTARY = 'COMPLEMENTARY',      // "Pairs well with..."
  BUNDLE_UPGRADE = 'BUNDLE_UPGRADE',    // "Save by bundling"
  QUANTITY_DISCOUNT = 'QUANTITY_DISCOUNT', // "Buy 2, save 10%"

  // Threshold-based
  FREE_SHIPPING_ADD = 'FREE_SHIPPING_ADD', // "Add $X for free shipping"
  FREE_GIFT_THRESHOLD = 'FREE_GIFT_THRESHOLD', // "Add $X for free gift"

  // Upgrades
  PREMIUM_VERSION = 'PREMIUM_VERSION',  // "Upgrade to premium"
  SUBSCRIPTION = 'SUBSCRIPTION',        // "Subscribe & save 15%"

  // Protection
  SHIPPING_PROTECTION = 'SHIPPING_PROTECTION', // "Protect your order"
  WARRANTY = 'WARRANTY',                // "Add warranty"
}
```

### Upsell Recommendation Engine

```typescript
// apps/api/src/momentum-intelligence/cart-upsell/cart-upsell.service.ts

@Injectable()
export class CartUpsellService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upsellService: UpsellService,
    private readonly contentService: ContentGenerationService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Get upsell recommendations for a cart
   */
  async getCartUpsells(
    cartId: string,
    options?: {
      maxRecommendations?: number;
      excludeTypes?: CartUpsellType[];
    },
  ): Promise<CartUpsellRecommendation[]> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: { include: { product: true } },
        customer: true,
        company: true,
      },
    });

    const recommendations: CartUpsellRecommendation[] = [];

    // 1. Free shipping threshold
    if (this.shouldShowFreeShippingUpsell(cart)) {
      const freeShippingProducts = await this.getFreeShippingProducts(cart);
      recommendations.push({
        type: 'FREE_SHIPPING_ADD',
        products: freeShippingProducts,
        message: `Add $${this.getFreeShippingGap(cart).toFixed(2)} more for FREE shipping!`,
        priority: 1,
      });
    }

    // 2. Complementary products (AI-powered)
    const complementary = await this.getComplementaryProducts(cart);
    if (complementary.length) {
      recommendations.push({
        type: 'COMPLEMENTARY',
        products: complementary,
        message: 'Complete your order',
        priority: 2,
      });
    }

    // 3. Bundle opportunities
    const bundles = await this.findBundleOpportunities(cart);
    if (bundles.length) {
      recommendations.push({
        type: 'BUNDLE_UPGRADE',
        bundles,
        message: 'Save with a bundle',
        priority: 3,
      });
    }

    // 4. Subscription upsell
    if (this.isSubscriptionCandidate(cart)) {
      recommendations.push({
        type: 'SUBSCRIPTION',
        discount: 15,
        message: 'Subscribe & save 15% on every order',
        priority: 4,
      });
    }

    // 5. Shipping protection
    if (cart.grandTotal > 50 && !this.hasShippingProtection(cart)) {
      recommendations.push({
        type: 'SHIPPING_PROTECTION',
        price: 4.99,
        message: 'Protect your order for just $4.99',
        priority: 5,
      });
    }

    // Sort by priority and limit
    return recommendations
      .filter(r => !options?.excludeTypes?.includes(r.type))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, options?.maxRecommendations || 3);
  }

  /**
   * AI-powered complementary product recommendation
   */
  private async getComplementaryProducts(
    cart: CartWithItems,
  ): Promise<Product[]> {
    const cartProductIds = cart.items.map(i => i.productId);
    const cartProductNames = cart.items.map(i => i.product.name);

    // Get candidate products
    const candidates = await this.prisma.product.findMany({
      where: {
        companyId: cart.companyId,
        id: { notIn: cartProductIds },
        status: 'ACTIVE',
        inventory: { some: { available: { gt: 0 } } },
      },
      take: 20,
      orderBy: { salesCount: 'desc' },
    });

    if (!candidates.length) return [];

    // Use AI to rank by relevance
    const prompt = `
      Given a shopping cart containing: ${cartProductNames.join(', ')}

      Rank these products by how well they complement the cart items:
      ${candidates.map((p, i) => `${i + 1}. ${p.name} - ${p.description}`).join('\n')}

      Return the top 3 product numbers that would best complement this purchase,
      with a brief reason for each. Format: "1, 3, 5"
    `;

    const response = await this.anthropic.complete(cart.companyId, prompt);
    const rankedIds = this.parseRankedProducts(response, candidates);

    return candidates.filter(p => rankedIds.includes(p.id)).slice(0, 3);
  }

  /**
   * Find bundle opportunities
   */
  private async findBundleOpportunities(
    cart: CartWithItems,
  ): Promise<BundleOpportunity[]> {
    const cartProductIds = cart.items.map(i => i.productId);

    // Find bundles containing cart items
    const bundles = await this.prisma.productBundle.findMany({
      where: {
        companyId: cart.companyId,
        status: 'ACTIVE',
        items: {
          some: { productId: { in: cartProductIds } },
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    return bundles
      .map(bundle => {
        const itemsInCart = bundle.items.filter(
          i => cartProductIds.includes(i.productId)
        );
        const itemsNeeded = bundle.items.filter(
          i => !cartProductIds.includes(i.productId)
        );
        const savings = this.calculateBundleSavings(cart, bundle);

        return {
          bundle,
          itemsInCart: itemsInCart.length,
          itemsNeeded,
          savings,
          message: `Add ${itemsNeeded.length} more items to save $${savings.toFixed(2)}`,
        };
      })
      .filter(b => b.savings > 5) // Only show if meaningful savings
      .sort((a, b) => b.savings - a.savings);
  }
}
```

### Upsell UI Components

```typescript
// apps/company-portal/src/components/cart/upsell/cart-upsell-section.tsx

'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/cart-context';
import { CartUpsellRecommendation } from '@/types/upsell';
import { FreeShippingUpsell } from './free-shipping-upsell';
import { ComplementaryProducts } from './complementary-products';
import { BundleUpsell } from './bundle-upsell';
import { SubscriptionUpsell } from './subscription-upsell';
import { ShippingProtection } from './shipping-protection';

export function CartUpsellSection() {
  const { cart } = useCart();
  const [recommendations, setRecommendations] = useState<CartUpsellRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cart?.id) {
      fetchUpsellRecommendations(cart.id)
        .then(setRecommendations)
        .finally(() => setLoading(false));
    }
  }, [cart?.id, cart?.items]);

  if (loading || !recommendations.length) return null;

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Complete your order
      </h3>

      {recommendations.map((rec, index) => {
        switch (rec.type) {
          case 'FREE_SHIPPING_ADD':
            return (
              <FreeShippingUpsell
                key={index}
                products={rec.products}
                gap={rec.gap}
                threshold={rec.threshold}
              />
            );
          case 'COMPLEMENTARY':
            return (
              <ComplementaryProducts
                key={index}
                products={rec.products}
                message={rec.message}
              />
            );
          case 'BUNDLE_UPGRADE':
            return (
              <BundleUpsell
                key={index}
                bundles={rec.bundles}
              />
            );
          case 'SUBSCRIPTION':
            return (
              <SubscriptionUpsell
                key={index}
                discount={rec.discount}
                cartItems={cart.items}
              />
            );
          case 'SHIPPING_PROTECTION':
            return (
              <ShippingProtection
                key={index}
                price={rec.price}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
```

---

## 5. Checkout Churn Detection

### Overview

Monitor user behavior during checkout to detect abandonment signals and trigger interventions.

### Churn Signals

```typescript
enum CheckoutChurnSignal {
  // Payment issues
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  MULTIPLE_PAYMENT_ATTEMPTS = 'MULTIPLE_PAYMENT_ATTEMPTS',
  PAYMENT_METHOD_SWITCH = 'PAYMENT_METHOD_SWITCH',

  // Price sensitivity
  SHIPPING_COST_SHOCK = 'SHIPPING_COST_SHOCK',     // Saw shipping, removed items
  TAX_SHOCK = 'TAX_SHOCK',                         // Saw tax, hesitated
  DISCOUNT_CODE_FAILURE = 'DISCOUNT_CODE_FAILURE', // Failed codes
  DISCOUNT_HUNTING = 'DISCOUNT_HUNTING',           // Multiple code attempts

  // Information seeking
  POLICY_PAGE_VISIT = 'POLICY_PAGE_VISIT',         // Returns, shipping policy
  FAQ_VISIT = 'FAQ_VISIT',                         // Looking for answers
  TAB_SWITCHING = 'TAB_SWITCHING',                 // Comparing elsewhere

  // Form friction
  LONG_FORM_TIME = 'LONG_FORM_TIME',               // > 5 min on form
  FORM_FIELD_ERRORS = 'FORM_FIELD_ERRORS',         // Multiple validation errors
  ADDRESS_ISSUES = 'ADDRESS_ISSUES',               // Invalid address attempts

  // Exit signals
  MOUSE_EXIT_INTENT = 'MOUSE_EXIT_INTENT',         // Mouse toward close/back
  BACK_BUTTON = 'BACK_BUTTON',                     // Clicked back
  TAB_CLOSE_ATTEMPT = 'TAB_CLOSE_ATTEMPT',         // beforeunload fired
  IDLE_TIMEOUT = 'IDLE_TIMEOUT',                   // No activity 2+ min
}
```

### Churn Detection Service

```typescript
// apps/company-portal/src/hooks/use-checkout-churn-detection.ts

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useCart } from '@/contexts/cart-context';

interface ChurnDetectionConfig {
  onSignalDetected: (signal: CheckoutChurnSignal, data?: any) => void;
  onInterventionNeeded: (intervention: CheckoutIntervention) => void;
}

export function useCheckoutChurnDetection(config: ChurnDetectionConfig) {
  const { cart } = useCart();
  const signalsRef = useRef<Map<CheckoutChurnSignal, number>>(new Map());
  const startTimeRef = useRef(Date.now());

  // Track shipping cost shock
  const trackShippingCostShock = useCallback(() => {
    const originalItemCount = cart?.items.length || 0;

    return (newItemCount: number, shippingCost: number) => {
      if (newItemCount < originalItemCount && shippingCost > 0) {
        config.onSignalDetected('SHIPPING_COST_SHOCK', {
          itemsRemoved: originalItemCount - newItemCount,
          shippingCost,
        });

        // Trigger free shipping intervention
        config.onInterventionNeeded({
          type: 'FREE_SHIPPING_OFFER',
          message: "We noticed shipping costs. Here's free shipping on us!",
          action: { type: 'APPLY_FREE_SHIPPING' },
        });
      }
    };
  }, [cart?.items.length, config]);

  // Track discount code frustration
  const trackDiscountAttempts = useCallback((attempts: number, allFailed: boolean) => {
    if (attempts >= 2 && allFailed) {
      config.onSignalDetected('DISCOUNT_HUNTING', { attempts });

      // Offer help
      config.onInterventionNeeded({
        type: 'DISCOUNT_HELP',
        message: "Having trouble with a code? Chat with us for help!",
        action: { type: 'OPEN_CHAT' },
      });
    }
  }, [config]);

  // Track form time
  useEffect(() => {
    const checkFormTime = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60; // minutes

      if (elapsed > 5 && !signalsRef.current.has('LONG_FORM_TIME')) {
        signalsRef.current.set('LONG_FORM_TIME', elapsed);
        config.onSignalDetected('LONG_FORM_TIME', { minutes: elapsed });

        // Offer assistance
        config.onInterventionNeeded({
          type: 'CHECKOUT_HELP',
          message: "Need help completing your order? We're here!",
          action: { type: 'OPEN_CHAT' },
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkFormTime);
  }, [config]);

  // Track exit intent
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        config.onSignalDetected('MOUSE_EXIT_INTENT');

        // Show exit intent modal
        config.onInterventionNeeded({
          type: 'EXIT_INTENT',
          message: "Wait! Complete your order now and get 10% off!",
          action: { type: 'APPLY_DISCOUNT', discount: 10 },
        });
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [config]);

  // Track beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      config.onSignalDetected('TAB_CLOSE_ATTEMPT');

      // Browser will show confirmation
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [config]);

  return {
    trackShippingCostShock,
    trackDiscountAttempts,
    signalsDetected: signalsRef.current,
  };
}
```

### Intervention Handler

```typescript
// apps/company-portal/src/components/checkout/checkout-intervention-handler.tsx

'use client';

import { useState, useCallback } from 'react';
import { useCheckoutChurnDetection } from '@/hooks/use-checkout-churn-detection';
import { ExitIntentModal } from './interventions/exit-intent-modal';
import { ChatBubble } from './interventions/chat-bubble';
import { DiscountNotification } from './interventions/discount-notification';

export function CheckoutInterventionHandler({ children }) {
  const [activeIntervention, setActiveIntervention] = useState<CheckoutIntervention | null>(null);
  const [appliedDiscounts, setAppliedDiscounts] = useState<string[]>([]);

  const handleSignalDetected = useCallback((signal, data) => {
    // Log to analytics
    trackCheckoutSignal(signal, data);
  }, []);

  const handleInterventionNeeded = useCallback((intervention) => {
    // Don't show same intervention twice
    if (appliedDiscounts.includes(intervention.type)) return;

    setActiveIntervention(intervention);
  }, [appliedDiscounts]);

  const handleInterventionAction = useCallback(async (action) => {
    switch (action.type) {
      case 'APPLY_DISCOUNT':
        await applyDiscount(action.discount);
        setAppliedDiscounts(prev => [...prev, activeIntervention.type]);
        break;
      case 'APPLY_FREE_SHIPPING':
        await applyFreeShipping();
        break;
      case 'OPEN_CHAT':
        openChatWidget();
        break;
    }
    setActiveIntervention(null);
  }, [activeIntervention]);

  useCheckoutChurnDetection({
    onSignalDetected: handleSignalDetected,
    onInterventionNeeded: handleInterventionNeeded,
  });

  return (
    <>
      {children}

      {activeIntervention?.type === 'EXIT_INTENT' && (
        <ExitIntentModal
          open={true}
          message={activeIntervention.message}
          discount={activeIntervention.action.discount}
          onAccept={() => handleInterventionAction(activeIntervention.action)}
          onDecline={() => setActiveIntervention(null)}
        />
      )}

      {activeIntervention?.type === 'CHECKOUT_HELP' && (
        <ChatBubble
          message={activeIntervention.message}
          onOpen={() => handleInterventionAction(activeIntervention.action)}
          onDismiss={() => setActiveIntervention(null)}
        />
      )}

      {activeIntervention?.type === 'FREE_SHIPPING_OFFER' && (
        <DiscountNotification
          type="free-shipping"
          message={activeIntervention.message}
          onAccept={() => handleInterventionAction(activeIntervention.action)}
          onDismiss={() => setActiveIntervention(null)}
        />
      )}
    </>
  );
}
```

---

## 6. CS AI Chat Integration

### Overview

Embed the MI CS AI chat widget in the checkout flow for instant assistance.

### Checkout Chat Configuration

```typescript
interface CheckoutChatConfig {
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left' | 'inline';

  // Pre-populated quick questions
  quickQuestions: string[];

  // AI capabilities in checkout context
  aiCapabilities: {
    canAnswerShipping: boolean;
    canAnswerReturns: boolean;
    canAnswerPayment: boolean;
    canApplyDiscounts: boolean;
    maxDiscountPercent: number;
    canModifyCart: boolean;
  };

  // Escalation
  escalateToHuman: {
    onRequest: boolean;
    onFrustration: boolean;
    onHighValue: boolean;
    highValueThreshold: number;
  };
}

const DEFAULT_CHECKOUT_CHAT_CONFIG: CheckoutChatConfig = {
  enabled: true,
  position: 'bottom-right',
  quickQuestions: [
    "What's the shipping cost to my area?",
    "Do you accept PayPal?",
    "Can I change my order after placing it?",
    "How do I apply a discount code?",
    "What's your return policy?",
  ],
  aiCapabilities: {
    canAnswerShipping: true,
    canAnswerReturns: true,
    canAnswerPayment: true,
    canApplyDiscounts: true,
    maxDiscountPercent: 10,
    canModifyCart: false,
  },
  escalateToHuman: {
    onRequest: true,
    onFrustration: true,
    onHighValue: true,
    highValueThreshold: 500,
  },
};
```

### Checkout Chat Widget

```typescript
// apps/company-portal/src/components/checkout/checkout-chat-widget.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

interface ChatAction {
  type: 'apply_discount' | 'update_shipping' | 'escalate';
  label: string;
  data?: any;
}

export function CheckoutChatWidget() {
  const { cart } = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session
  useEffect(() => {
    if (open && !sessionId) {
      initChatSession();
    }
  }, [open]);

  const initChatSession = async () => {
    const response = await fetch('/api/momentum/cs/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'CHECKOUT_CHAT',
        context: {
          cartId: cart?.id,
          cartValue: cart?.grandTotal,
          itemCount: cart?.itemCount,
          checkoutStep: 'payment',
        },
      }),
    });

    const session = await response.json();
    setSessionId(session.id);

    // Add welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm here to help you complete your order. What can I help with?",
      timestamp: new Date(),
    }]);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !sessionId) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/api/momentum/cs/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        actions: result.suggestedActions,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Handle automatic actions
      if (result.autoAppliedDiscount) {
        // Refresh cart to show discount
        await refreshCart();
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: ChatAction) => {
    switch (action.type) {
      case 'apply_discount':
        await applyDiscount(action.data.code);
        break;
      case 'update_shipping':
        await updateShippingMethod(action.data.method);
        break;
      case 'escalate':
        await escalateToHuman(sessionId);
        break;
    }
  };

  // Quick questions
  const quickQuestions = [
    "Shipping cost?",
    "Return policy?",
    "Have a code?",
    "Need help",
  ];

  return (
    <>
      {/* Chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-background rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Checkout Help</p>
                <p className="text-xs opacity-80">Usually replies instantly</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-primary-foreground/20 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>

                  {/* Action buttons */}
                  {message.actions?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(action)}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-full hover:opacity-90"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-1 text-xs border rounded-full hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 7. Voice AI Cart Recovery

### Overview

For high-value abandoned carts, initiate AI-powered voice calls to recover the sale.

### Voice Recovery Criteria

```typescript
interface VoiceRecoveryConfig {
  enabled: boolean;

  // Eligibility criteria
  minCartValue: number;           // Default: $100
  minCustomerLTV: number;         // Default: $200
  minAbandonmentHours: number;    // Default: 24
  maxAbandonmentHours: number;    // Default: 72
  requireEmailAttempts: number;   // Default: 2
  requirePhone: boolean;          // Default: true

  // Exclusions
  excludeFirstTimeBuyers: boolean;
  excludeRecentCalls: number;     // Days since last call

  // Timing
  callHours: { start: number; end: number }; // e.g., 9-20
  timezone: string;
  maxCallsPerDay: number;

  // Script selection
  scriptPriority: VoiceScriptType[];
}

const DEFAULT_VOICE_RECOVERY_CONFIG: VoiceRecoveryConfig = {
  enabled: true,
  minCartValue: 100,
  minCustomerLTV: 200,
  minAbandonmentHours: 24,
  maxAbandonmentHours: 72,
  requireEmailAttempts: 2,
  requirePhone: true,
  excludeFirstTimeBuyers: false,
  excludeRecentCalls: 7,
  callHours: { start: 9, end: 20 },
  timezone: 'America/New_York',
  maxCallsPerDay: 50,
  scriptPriority: ['CART_RECOVERY_PERSONAL', 'CART_RECOVERY_DISCOUNT', 'CART_RECOVERY_HELP'],
};
```

### Voice Recovery Script Template

```typescript
const CART_RECOVERY_VOICE_SCRIPT: VoiceScript = {
  type: 'CART_RECOVERY',

  opening: {
    greeting: "Hi, is this {{customerName}}?",
    introduction: "This is {{agentName}} from {{companyName}}. I noticed you left some great items in your cart, and I wanted to personally reach out to see if I can help.",
    confirmContinue: "Do you have a quick moment?",
  },

  diagnosis: {
    primaryQuestion: "I see you had our {{topItemName}} in your cart. Was there anything about your order that gave you pause?",
    followUps: [
      {
        trigger: "price|expensive|cost",
        response: "I completely understand. Price is important. I can actually offer you {{discountPercent}}% off your order right now if that helps.",
      },
      {
        trigger: "shipping|delivery",
        response: "Got it. Shipping costs can add up. What if I waived the shipping fee for you today?",
      },
      {
        trigger: "just looking|not ready|thinking",
        response: "No problem at all! I'll save your cart for you. Would you like me to send you an email with a link so you can easily come back when you're ready?",
      },
      {
        trigger: "questions|not sure|confused",
        response: "I'd be happy to help! What questions can I answer for you about the product?",
      },
    ],
  },

  objectionHandling: {
    patterns: [
      {
        trigger: "not interested",
        response: "I appreciate your time. Before I let you go, can I at least save your cart and send you a reminder in case you change your mind?",
      },
      {
        trigger: "too busy",
        response: "I understand you're busy. Would you prefer I send you a text with a link to complete your order when it's more convenient?",
      },
      {
        trigger: "found it cheaper",
        response: "Oh, where did you find it? We do price matching, so I might be able to help you out.",
      },
    ],
  },

  closing: {
    accepted: "Wonderful! I've applied the discount to your cart. You should receive an email with a link to complete your order. Is there anything else I can help with?",
    declined: "No problem, {{customerName}}. Thanks for your time. If you change your mind, your cart will be saved for the next 7 days. Have a great day!",
    escalate: "Let me connect you with a team member who can better assist you. One moment please.",
  },

  settings: {
    voice: 'Polly.Joanna',
    speechRate: 1.0,
    maxRetries: 2,
    transferNumber: '+1-888-XXX-XXXX',
  },
};
```

### Voice Recovery Service

```typescript
// apps/api/src/momentum-intelligence/cart-voice/cart-voice-recovery.service.ts

@Injectable()
export class CartVoiceRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly voiceService: VoiceAIService,
    private readonly cartSaveService: CartSaveService,
  ) {}

  /**
   * Check and initiate voice recovery for eligible carts
   * Called by cron job
   */
  @Cron('0 */30 9-20 * * *') // Every 30 min during business hours
  async processVoiceRecoveryQueue(): Promise<void> {
    const companies = await this.getCompaniesWithVoiceEnabled();

    for (const company of companies) {
      const config = await this.getVoiceConfig(company.id);
      const eligibleCarts = await this.getEligibleCarts(company.id, config);

      // Limit calls per company
      const todaysCalls = await this.getTodaysCallCount(company.id);
      const remaining = config.maxCallsPerDay - todaysCalls;

      const cartsToCall = eligibleCarts.slice(0, remaining);

      for (const cart of cartsToCall) {
        await this.initiateVoiceRecovery(cart, config);
      }
    }
  }

  /**
   * Get carts eligible for voice recovery
   */
  private async getEligibleCarts(
    companyId: string,
    config: VoiceRecoveryConfig,
  ): Promise<Cart[]> {
    const minAbandonedAt = new Date(
      Date.now() - config.minAbandonmentHours * 60 * 60 * 1000
    );
    const maxAbandonedAt = new Date(
      Date.now() - config.maxAbandonmentHours * 60 * 60 * 1000
    );

    return this.prisma.cart.findMany({
      where: {
        companyId,
        status: 'ABANDONED',
        abandonedAt: {
          gte: maxAbandonedAt,
          lte: minAbandonedAt,
        },
        grandTotal: { gte: config.minCartValue },
        customer: {
          phone: { not: null },
          ...(config.minCustomerLTV > 0 && {
            lifetimeValue: { gte: config.minCustomerLTV },
          }),
        },
        // Has required email attempts
        saveAttempts: {
          some: {
            interventions: {
              some: {
                channel: 'EMAIL',
                deliveredAt: { not: null },
              },
            },
          },
        },
        // No recent voice calls
        voiceCalls: {
          none: {
            createdAt: {
              gte: new Date(Date.now() - config.excludeRecentCalls * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        saveAttempts: true,
      },
      orderBy: { grandTotal: 'desc' }, // Prioritize high-value carts
      take: 50,
    });
  }

  /**
   * Initiate voice call for cart recovery
   */
  private async initiateVoiceRecovery(
    cart: CartWithDetails,
    config: VoiceRecoveryConfig,
  ): Promise<VoiceCall> {
    // Determine best script
    const script = await this.selectScript(cart, config);

    // Get or create save attempt
    let saveAttempt = cart.saveAttempts.find(a => a.status === 'IN_PROGRESS');
    if (!saveAttempt) {
      saveAttempt = await this.cartSaveService.initiateCartSaveFlow(cart.id);
    }

    // Determine offer based on cart value and customer LTV
    const offer = this.calculateOffer(cart);

    // Initiate call
    const call = await this.voiceService.initiateOutboundCall({
      customerId: cart.customerId,
      companyId: cart.companyId,
      phone: cart.customer.phone,
      scriptType: 'CART_RECOVERY',
      context: {
        cartId: cart.id,
        saveAttemptId: saveAttempt.id,
        cartValue: Number(cart.grandTotal),
        topItemName: cart.items[0]?.product.name,
        customerName: cart.customer.firstName || 'there',
        discountPercent: offer.discountPercent,
        freeShipping: offer.freeShipping,
        recoveryUrl: this.generateRecoveryUrl(cart),
      },
    });

    // Record intervention
    await this.prisma.cartIntervention.create({
      data: {
        cartSaveAttemptId: saveAttempt.id,
        cartId: cart.id,
        stage: 'NUCLEAR_OFFER',
        channels: ['VOICE'],
        content: { callId: call.id, script: script.type, offer },
        scheduledAt: new Date(),
      },
    });

    return call;
  }
}
```

---

## 8. AI-Generated Recovery Content

### Overview

Use MI's `ContentGenerationService` to create personalized cart recovery messages.

### Content Types

```typescript
enum CartRecoveryContentType {
  // Email
  ABANDONMENT_EMAIL_1 = 'ABANDONMENT_EMAIL_1',  // 1 hour - "Forgot something?"
  ABANDONMENT_EMAIL_2 = 'ABANDONMENT_EMAIL_2',  // 24 hours - "Still thinking?"
  ABANDONMENT_EMAIL_3 = 'ABANDONMENT_EMAIL_3',  // 48 hours - "Last chance!"

  // SMS
  ABANDONMENT_SMS = 'ABANDONMENT_SMS',          // Short, urgent
  DISCOUNT_SMS = 'DISCOUNT_SMS',                 // With offer

  // Push
  ABANDONMENT_PUSH = 'ABANDONMENT_PUSH',        // Mobile notification

  // In-App
  RETURN_VISITOR_MODAL = 'RETURN_VISITOR_MODAL', // When they come back
  EXIT_INTENT_MODAL = 'EXIT_INTENT_MODAL',       // Before leaving
}
```

### Content Generation Request

```typescript
interface CartRecoveryContentRequest {
  type: CartRecoveryContentType;
  cart: {
    id: string;
    items: { name: string; price: number; imageUrl?: string }[];
    total: number;
    abandonedAt: Date;
  };
  customer: {
    name?: string;
    tenure?: number;
    orderCount?: number;
    ltv?: number;
  };
  offer?: {
    discountPercent?: number;
    freeShipping?: boolean;
    giftWithPurchase?: string;
  };
  style?: {
    brandVoice: 'friendly' | 'professional' | 'playful' | 'urgent';
    urgencyLevel: 'low' | 'medium' | 'high';
  };
  triggers?: BehavioralTrigger[];
}
```

### Content Generation Service Extension

```typescript
// apps/api/src/momentum-intelligence/content/cart-content.service.ts

@Injectable()
export class CartContentService {
  constructor(
    private readonly contentService: ContentGenerationService,
    private readonly triggerService: TriggerLibraryService,
  ) {}

  /**
   * Generate cart recovery email content
   */
  async generateRecoveryEmail(
    request: CartRecoveryContentRequest,
  ): Promise<GeneratedEmail> {
    const { type, cart, customer, offer, style } = request;

    // Select appropriate triggers
    const triggers = await this.selectTriggers(type, cart, customer);

    // Build prompt
    const prompt = this.buildEmailPrompt(type, cart, customer, offer, triggers);

    // Generate via AI
    const generated = await this.contentService.generateContent({
      type: 'EMAIL_SEQUENCE',
      prompt,
      style: style || { brandVoice: 'friendly', urgencyLevel: this.getUrgencyLevel(type) },
      triggers: triggers.map(t => t.id),
    });

    return {
      subject: generated.subject,
      preheader: generated.preheader,
      headline: generated.headline,
      body: generated.body,
      cta: {
        text: generated.ctaText,
        url: this.generateRecoveryUrl(cart.id, offer),
      },
      triggersApplied: triggers,
      tokenUsage: generated.tokenUsage,
    };
  }

  /**
   * Build email prompt based on type
   */
  private buildEmailPrompt(
    type: CartRecoveryContentType,
    cart: CartInfo,
    customer: CustomerInfo,
    offer?: OfferInfo,
    triggers?: BehavioralTrigger[],
  ): string {
    const itemList = cart.items.map(i => `- ${i.name} ($${i.price})`).join('\n');
    const customerContext = customer.name
      ? `The customer's name is ${customer.name}. They've been a customer for ${customer.tenure || 0} days with ${customer.orderCount || 0} previous orders.`
      : 'This is a guest checkout.';

    const offerContext = offer
      ? `Include this offer: ${offer.discountPercent ? `${offer.discountPercent}% off` : ''} ${offer.freeShipping ? '+ free shipping' : ''}`
      : 'No special offer - focus on value and urgency.';

    const triggerContext = triggers?.length
      ? `Apply these psychological triggers: ${triggers.map(t => t.name).join(', ')}`
      : '';

    switch (type) {
      case 'ABANDONMENT_EMAIL_1':
        return `
          Write a friendly cart abandonment email for someone who left items in their cart 1 hour ago.

          Cart contents:
          ${itemList}
          Cart total: $${cart.total}

          ${customerContext}
          ${offerContext}
          ${triggerContext}

          Tone: Helpful, not pushy. Assume they got distracted.
          Goal: Remind them of their cart and make it easy to return.
        `;

      case 'ABANDONMENT_EMAIL_2':
        return `
          Write a cart recovery email for someone who left items 24 hours ago.

          Cart contents:
          ${itemList}
          Cart total: $${cart.total}

          ${customerContext}
          ${offerContext}
          ${triggerContext}

          Tone: Slightly more urgent. Mention scarcity if applicable.
          Goal: Create urgency while remaining helpful.
        `;

      case 'ABANDONMENT_EMAIL_3':
        return `
          Write a final attempt cart recovery email for someone who left items 48 hours ago.

          Cart contents:
          ${itemList}
          Cart total: $${cart.total}

          ${customerContext}
          ${offerContext}
          ${triggerContext}

          Tone: Last chance urgency. Best offer if available.
          Goal: Final push to recover the sale.
        `;

      default:
        throw new Error(`Unknown content type: ${type}`);
    }
  }
}
```

---

## 9. Analytics Dashboard

### Cart Intelligence Metrics

```typescript
interface CartIntelligenceMetrics {
  // Recovery performance
  recovery: {
    totalAbandoned: number;
    totalRecovered: number;
    recoveryRate: number;
    recoveryValue: number;
    avgTimeToRecovery: number; // hours
  };

  // Channel performance
  channels: {
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'VOICE' | 'IN_APP';
    attempts: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }[];

  // Stage performance
  stages: {
    stage: CartSaveStage;
    reached: number;
    converted: number;
    conversionRate: number;
  }[];

  // Intervention performance
  interventions: {
    type: InterventionType;
    shown: number;
    accepted: number;
    acceptanceRate: number;
    avgDiscount: number;
    revenue: number;
  }[];

  // Trigger performance
  triggers: {
    trigger: BehavioralTrigger;
    impressions: number;
    interactions: number;
    conversions: number;
    liftVsControl: number;
  }[];

  // Upsell performance
  upsells: {
    type: CartUpsellType;
    presented: number;
    accepted: number;
    revenue: number;
    avgOrderValueLift: number;
  }[];

  // Voice recovery
  voice: {
    callsInitiated: number;
    callsCompleted: number;
    cartsRecovered: number;
    avgCallDuration: number;
    revenueRecovered: number;
  };
}
```

### Dashboard API Endpoints

```typescript
// GET /api/momentum/cart-intelligence/overview
interface CartIntelligenceOverviewResponse {
  period: { start: Date; end: Date };
  metrics: CartIntelligenceMetrics;
  trends: {
    recoveryRate: TrendData;
    avgCartValue: TrendData;
    upsellAcceptance: TrendData;
  };
}

// GET /api/momentum/cart-intelligence/recovery
interface CartRecoveryAnalyticsResponse {
  byChannel: ChannelMetrics[];
  byStage: StageMetrics[];
  byIntervention: InterventionMetrics[];
  topRecoveredProducts: ProductMetrics[];
  recoveryTimeline: TimelineData[];
}

// GET /api/momentum/cart-intelligence/triggers
interface TriggerAnalyticsResponse {
  performance: TriggerPerformance[];
  abTestResults: ABTestResult[];
  recommendations: TriggerRecommendation[];
}

// GET /api/momentum/cart-intelligence/upsells
interface UpsellAnalyticsResponse {
  byType: UpsellTypeMetrics[];
  byProduct: ProductUpsellMetrics[];
  conversionFunnel: FunnelData;
  revenueAttribution: RevenueData;
}
```

---

## 10. Database Schema

### New Models

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// CART SAVE ATTEMPTS - Track cart recovery flows
// ═══════════════════════════════════════════════════════════════════════════════

model CartSaveAttempt {
  id              String   @id @default(cuid())
  cartId          String
  companyId       String
  customerId      String?

  currentStage    CartSaveStage
  stageHistory    Json     @default("[]")  // Array of stage transitions

  diagnosisReason CartAbandonmentReason?
  diagnosisAnswers Json    @default("{}")

  customerRiskScore Float  @default(0)
  cartValue         Decimal @db.Decimal(12, 2)

  status          CartSaveStatus @default(IN_PROGRESS)
  outcome         CartSaveOutcome?

  startedAt       DateTime @default(now())
  completedAt     DateTime?

  currentOffer    Json?    // Active offer details
  acceptedOffer   Json?    // Accepted offer details

  metadata        Json     @default("{}")

  cart            Cart     @relation(fields: [cartId], references: [id])
  company         Company  @relation(fields: [companyId], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  interventions   CartIntervention[]
  voiceCalls      CartVoiceCall[]

  @@index([cartId, status])
  @@index([companyId, status])
  @@index([customerId])
  @@map("cart_save_attempts")
}

enum CartSaveStage {
  BROWSE_REMINDER
  PATTERN_INTERRUPT
  DIAGNOSIS_SURVEY
  BRANCHING_INTERVENTION
  NUCLEAR_OFFER
  LOSS_VISUALIZATION
  WINBACK_SEQUENCE
}

enum CartAbandonmentReason {
  TOO_EXPENSIVE
  SHIPPING_COST
  JUST_BROWSING
  NEED_MORE_INFO
  PAYMENT_ISSUES
  COMPARING_OPTIONS
  SAVING_FOR_LATER
  OTHER
}

enum CartSaveStatus {
  IN_PROGRESS
  COMPLETED
  EXPIRED
  CANCELLED
}

enum CartSaveOutcome {
  CONVERTED
  SAVED_WITH_DISCOUNT
  SAVED_WITHOUT_DISCOUNT
  PAUSED
  CANCELLED
  EXHAUSTED
  EXPIRED
}

// ═══════════════════════════════════════════════════════════════════════════════
// CART INTERVENTIONS - Individual intervention attempts
// ═══════════════════════════════════════════════════════════════════════════════

model CartIntervention {
  id                  String   @id @default(cuid())
  cartSaveAttemptId   String
  cartId              String

  stage               CartSaveStage
  channels            String[]  // EMAIL, SMS, PUSH, VOICE, IN_APP

  content             Json      // Message content, subject, body, etc.
  triggersUsed        String[]  // Behavioral triggers applied
  offerIncluded       Json?     // Discount, free shipping, etc.

  scheduledAt         DateTime
  sentAt              DateTime?
  deliveredAt         DateTime?
  openedAt            DateTime?
  clickedAt           DateTime?
  convertedAt         DateTime?

  status              InterventionStatus @default(SCHEDULED)
  errorMessage        String?

  cartSaveAttempt     CartSaveAttempt @relation(fields: [cartSaveAttemptId], references: [id])
  cart                Cart            @relation(fields: [cartId], references: [id])

  @@index([cartSaveAttemptId])
  @@index([cartId, status])
  @@index([scheduledAt, status])
  @@map("cart_interventions")
}

enum InterventionStatus {
  SCHEDULED
  SENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  CONVERTED
  FAILED
  EXPIRED
}

// ═══════════════════════════════════════════════════════════════════════════════
// CART VOICE CALLS - Voice AI recovery calls
// ═══════════════════════════════════════════════════════════════════════════════

model CartVoiceCall {
  id                  String   @id @default(cuid())
  cartSaveAttemptId   String
  cartId              String
  voiceCallId         String   // Reference to VoiceCall in MI module

  scriptType          String
  offer               Json?

  initiatedAt         DateTime @default(now())
  answeredAt          DateTime?
  completedAt         DateTime?

  duration            Int?     // seconds
  outcome             VoiceCallOutcome?

  transcript          Json?    // Call transcript
  sentiment           String?  // POSITIVE, NEUTRAL, NEGATIVE

  cartSaveAttempt     CartSaveAttempt @relation(fields: [cartSaveAttemptId], references: [id])
  cart                Cart            @relation(fields: [cartId], references: [id])

  @@index([cartSaveAttemptId])
  @@index([cartId])
  @@map("cart_voice_calls")
}

enum VoiceCallOutcome {
  RECOVERED
  DISCOUNT_ACCEPTED
  CALLBACK_REQUESTED
  DECLINED
  NO_ANSWER
  VOICEMAIL
  ESCALATED
  DISCONNECTED
}

// ═══════════════════════════════════════════════════════════════════════════════
// CART UPSELL OFFERS - Track upsell presentations and conversions
// ═══════════════════════════════════════════════════════════════════════════════

model CartUpsellOffer {
  id          String   @id @default(cuid())
  cartId      String
  productId   String?
  bundleId    String?

  type        CartUpsellType
  position    String   // CART_DRAWER, CHECKOUT, POST_PURCHASE

  originalPrice Decimal @db.Decimal(10, 2)
  offerPrice    Decimal @db.Decimal(10, 2)
  savings       Decimal @db.Decimal(10, 2)

  message     String
  triggersUsed String[]

  presentedAt DateTime @default(now())
  viewedAt    DateTime?
  clickedAt   DateTime?
  acceptedAt  DateTime?
  declinedAt  DateTime?

  cart        Cart     @relation(fields: [cartId], references: [id])
  product     Product? @relation(fields: [productId], references: [id])

  @@index([cartId])
  @@index([type, presentedAt])
  @@map("cart_upsell_offers")
}

enum CartUpsellType {
  COMPLEMENTARY
  BUNDLE_UPGRADE
  QUANTITY_DISCOUNT
  FREE_SHIPPING_ADD
  FREE_GIFT_THRESHOLD
  PREMIUM_VERSION
  SUBSCRIPTION
  SHIPPING_PROTECTION
  WARRANTY
}

// ═══════════════════════════════════════════════════════════════════════════════
// CART TRIGGER IMPRESSIONS - Track behavioral trigger performance
// ═══════════════════════════════════════════════════════════════════════════════

model CartTriggerImpression {
  id          String   @id @default(cuid())
  cartId      String
  sessionId   String

  trigger     String   // SCARCITY, URGENCY, SOCIAL_PROOF, etc.
  placement   String   // CART_ITEM, CART_FOOTER, CHECKOUT, etc.

  variant     String?  // For A/B testing
  control     Boolean  @default(false)

  impressedAt DateTime @default(now())
  interactedAt DateTime?
  convertedAt DateTime?

  context     Json     @default("{}")  // Product ID, stock level, etc.

  cart        Cart     @relation(fields: [cartId], references: [id])

  @@index([cartId])
  @@index([trigger, impressedAt])
  @@index([variant, control])
  @@map("cart_trigger_impressions")
}

// ═══════════════════════════════════════════════════════════════════════════════
// CART SAVE FLOW CONFIG - Company-level configuration
// ═══════════════════════════════════════════════════════════════════════════════

model CartSaveFlowConfig {
  id          String   @id @default(cuid())
  companyId   String   @unique

  enabled     Boolean  @default(true)

  stages      Json     // Stage-specific configuration
  timing      Json     // Delay settings per stage
  offers      Json     // Max discounts, free shipping thresholds
  channels    Json     // Enabled channels per stage
  voice       Json     // Voice recovery configuration
  triggers    Json     // Enabled behavioral triggers

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])

  @@map("cart_save_flow_configs")
}
```

### Cart Model Updates

```prisma
model Cart {
  // ... existing fields ...

  // MI Integration
  saveAttempts        CartSaveAttempt[]
  interventions       CartIntervention[]
  voiceCalls          CartVoiceCall[]
  upsellOffers        CartUpsellOffer[]
  triggerImpressions  CartTriggerImpression[]
}
```

---

## 11. API Endpoints

### Cart Save Flow

```
POST   /api/momentum/cart-save/initiate
       Body: { cartId: string, reason?: CartAbandonmentReason }
       Response: CartSaveAttempt

POST   /api/momentum/cart-save/:attemptId/progress
       Body: { response?: CartSaveResponse }
       Response: CartSaveAttempt

POST   /api/momentum/cart-save/:attemptId/complete
       Body: { outcome: CartSaveOutcome }
       Response: CartSaveAttempt

GET    /api/momentum/cart-save/:attemptId
       Response: CartSaveAttempt

GET    /api/momentum/cart-save/config
       Response: CartSaveFlowConfig

PUT    /api/momentum/cart-save/config
       Body: CartSaveFlowConfig
       Response: CartSaveFlowConfig
```

### Cart Upsells

```
GET    /api/momentum/cart-upsell/:cartId/recommendations
       Query: { maxRecommendations?: number, excludeTypes?: string[] }
       Response: CartUpsellRecommendation[]

POST   /api/momentum/cart-upsell/:cartId/presented
       Body: { type: CartUpsellType, productId?: string }
       Response: CartUpsellOffer

POST   /api/momentum/cart-upsell/:offerId/accepted
       Response: { success: boolean, cartUpdated: boolean }

POST   /api/momentum/cart-upsell/:offerId/declined
       Response: { success: boolean }
```

### Cart Triggers

```
GET    /api/momentum/cart-triggers/:cartId
       Response: { triggers: ApplicableTrigger[], config: TriggerConfig }

POST   /api/momentum/cart-triggers/:cartId/impression
       Body: { trigger: string, placement: string, variant?: string }
       Response: CartTriggerImpression

POST   /api/momentum/cart-triggers/:cartId/interaction
       Body: { impressionId: string }
       Response: { success: boolean }
```

### Cart Intelligence Analytics

```
GET    /api/momentum/cart-intelligence/overview
       Query: { startDate, endDate }
       Response: CartIntelligenceOverviewResponse

GET    /api/momentum/cart-intelligence/recovery
       Query: { startDate, endDate }
       Response: CartRecoveryAnalyticsResponse

GET    /api/momentum/cart-intelligence/triggers
       Query: { startDate, endDate }
       Response: TriggerAnalyticsResponse

GET    /api/momentum/cart-intelligence/upsells
       Query: { startDate, endDate }
       Response: UpsellAnalyticsResponse
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

| Task | Deliverable |
|------|-------------|
| Define TypeScript types | `types/cart-mi.ts` |
| Create Prisma models | Migration file |
| Implement CartSaveService | Core service |
| Create CartSaveFlowConfig | Configuration system |
| Unit tests | 80% coverage |

### Phase 2: Behavioral Triggers (Weeks 3-4)

| Task | Deliverable |
|------|-------------|
| Create trigger components | UI components |
| Implement CartTriggersContext | React context |
| Build urgency/scarcity indicators | Components |
| Implement free shipping progress | Component |
| Loss aversion modal | Component |
| A/B testing infrastructure | Variant system |

### Phase 3: Upsell Engine (Weeks 4-5)

| Task | Deliverable |
|------|-------------|
| Implement CartUpsellService | Backend service |
| AI-powered recommendations | Anthropic integration |
| Upsell UI components | React components |
| Upsell tracking | Analytics |

### Phase 4: Recovery Flow (Weeks 5-6)

| Task | Deliverable |
|------|-------------|
| Implement cart save stages | Stage progression |
| Diagnosis survey flow | Interactive flow |
| Branching interventions | Logic engine |
| Multi-channel delivery | Email, SMS, push |

### Phase 5: AI Content (Weeks 6-7)

| Task | Deliverable |
|------|-------------|
| Extend ContentGenerationService | Cart templates |
| Recovery email templates | 3 email stages |
| SMS templates | Recovery messages |
| Push notification templates | Mobile alerts |

### Phase 6: Voice Recovery (Weeks 7-8)

| Task | Deliverable |
|------|-------------|
| Cart voice scripts | Script templates |
| Voice recovery criteria | Eligibility logic |
| Twilio integration | Call initiation |
| Transcript analysis | Outcome tracking |

### Phase 7: Checkout Integration (Weeks 8-9)

| Task | Deliverable |
|------|-------------|
| Churn detection hooks | Behavior tracking |
| Intervention handler | Real-time interventions |
| CS AI chat widget | Checkout chat |
| Exit intent handling | Modal system |

### Phase 8: Analytics (Weeks 9-10)

| Task | Deliverable |
|------|-------------|
| Analytics service | Metrics calculation |
| Dashboard API endpoints | REST API |
| Admin dashboard UI | React pages |
| Reporting exports | CSV/PDF |

### Phase 9: Testing & Launch (Weeks 10-11)

| Task | Deliverable |
|------|-------------|
| E2E tests | Playwright tests |
| Performance testing | Load tests |
| A/B test framework | Split testing |
| Beta rollout | 10% traffic |
| Full launch | 100% traffic |

---

## Summary

This specification outlines a comprehensive integration of Momentum Intelligence with the cart and checkout experience:

1. **Abandoned Cart Save Flow** - 7-stage cascade with multi-channel recovery
2. **Behavioral Triggers** - 13 psychological triggers in cart UI
3. **AI Upsell Engine** - Smart product recommendations
4. **Checkout Churn Detection** - Real-time intervention system
5. **CS AI Chat** - Instant checkout assistance
6. **Voice AI Recovery** - High-value cart recovery calls
7. **AI Content Generation** - Personalized recovery messaging
8. **Analytics Dashboard** - Full funnel visibility

**Expected Outcomes:**
- 15-20% reduction in cart abandonment
- 3-4x increase in recovery rate
- 10-15% increase in average order value
- Unified, AI-powered shopping experience

---

*Document Version: 1.0*
*Created: January 2026*
*Authors: Product, Architecture, Engineering*
