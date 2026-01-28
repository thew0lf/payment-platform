import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CartSaveService } from './cart-save.service';
import { CartAbandonmentReason, CartSaveStage } from './types/cart-save.types';

/**
 * Checkout Churn Detection Service
 *
 * Real-time behavioral analysis to detect and prevent cart abandonment
 * during the checkout process. Integrates with CS AI for escalation.
 *
 * Detection Signals:
 * - Form hesitation (time between fields)
 * - Back button navigation
 * - Tab switching / blur events
 * - Payment form abandonment
 * - Address lookup delays
 * - Price shock reactions (after seeing totals)
 */
@Injectable()
export class CheckoutChurnDetectionService {
  private readonly logger = new Logger(CheckoutChurnDetectionService.name);

  // Configurable thresholds (in milliseconds)
  private readonly THRESHOLDS = {
    FIELD_HESITATION: 30000, // 30s between fields
    PAYMENT_HESITATION: 45000, // 45s on payment field
    TAB_BLUR_DURATION: 15000, // 15s away from tab
    SCROLL_UP_COUNT: 3, // Scrolling back to review
    TOTAL_CHECKOUT_TIME: 180000, // 3 min total
    PRICE_SHOCK_TIME: 5000, // 5s staring at total
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cartSaveService: CartSaveService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // EVENT TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track checkout behavior event from frontend
   */
  async trackCheckoutEvent(
    sessionId: string,
    event: CheckoutEvent,
  ): Promise<{ alert?: ChurnAlert }> {
    // Get or create session tracking record
    const sessionData = await this.getOrCreateSessionData(sessionId);

    // Update session with new event
    const updatedData = this.processEvent(sessionData, event);

    // Save updated session data
    await this.updateSessionData(sessionId, updatedData);

    // Check for churn signals
    const alert = await this.analyzeChurnSignals(sessionId, updatedData, event);

    if (alert) {
      await this.handleChurnAlert(sessionId, alert);
      return { alert };
    }

    return {};
  }

  /**
   * Process individual checkout event
   */
  private processEvent(
    sessionData: CheckoutSessionData,
    event: CheckoutEvent,
  ): CheckoutSessionData {
    const now = Date.now();

    switch (event.type) {
      case 'FIELD_FOCUS':
        return {
          ...sessionData,
          currentField: event.field,
          lastFieldFocusTime: now,
          fieldHistory: [
            ...sessionData.fieldHistory,
            { field: event.field!, timestamp: now },
          ],
        };

      case 'FIELD_BLUR':
        const fieldTime = now - (sessionData.lastFieldFocusTime || now);
        return {
          ...sessionData,
          currentField: null,
          fieldTimings: {
            ...sessionData.fieldTimings,
            [event.field!]: (sessionData.fieldTimings[event.field!] || 0) + fieldTime,
          },
        };

      case 'TAB_BLUR':
        return {
          ...sessionData,
          tabBlurTime: now,
          tabBlurCount: sessionData.tabBlurCount + 1,
        };

      case 'TAB_FOCUS':
        const blurDuration = sessionData.tabBlurTime
          ? now - sessionData.tabBlurTime
          : 0;
        return {
          ...sessionData,
          tabBlurTime: null,
          totalTabBlurTime: sessionData.totalTabBlurTime + blurDuration,
        };

      case 'SCROLL_UP':
        return {
          ...sessionData,
          scrollUpCount: sessionData.scrollUpCount + 1,
          lastScrollUpTime: now,
        };

      case 'TOTAL_VIEWED':
        return {
          ...sessionData,
          totalViewedAt: sessionData.totalViewedAt || now,
          totalViewDuration: sessionData.totalViewDuration + (event.duration || 0),
        };

      case 'BACK_NAVIGATION':
        return {
          ...sessionData,
          backNavigationCount: sessionData.backNavigationCount + 1,
        };

      case 'PAYMENT_METHOD_CHANGED':
        return {
          ...sessionData,
          paymentMethodChanges: sessionData.paymentMethodChanges + 1,
        };

      case 'PROMO_CODE_ATTEMPT':
        return {
          ...sessionData,
          promoCodeAttempts: sessionData.promoCodeAttempts + 1,
          lastPromoAttempt: event.promoCode,
        };

      case 'CHECKOUT_STARTED':
        return {
          ...sessionData,
          checkoutStartTime: now,
        };

      case 'CHECKOUT_STEP_CHANGED':
        return {
          ...sessionData,
          currentStep: event.step,
          stepHistory: [
            ...sessionData.stepHistory,
            { step: event.step!, timestamp: now },
          ],
        };

      default:
        return sessionData;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CHURN ANALYSIS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Analyze session data for churn signals
   */
  private async analyzeChurnSignals(
    sessionId: string,
    data: CheckoutSessionData,
    latestEvent: CheckoutEvent,
  ): Promise<ChurnAlert | null> {
    const now = Date.now();
    const signals: ChurnSignal[] = [];

    // 1. Field hesitation detection
    if (data.lastFieldFocusTime) {
      const timeSinceLastFocus = now - data.lastFieldFocusTime;
      if (timeSinceLastFocus > this.THRESHOLDS.FIELD_HESITATION) {
        signals.push({
          type: 'FIELD_HESITATION',
          severity: 'medium',
          field: data.currentField,
          duration: timeSinceLastFocus,
        });
      }
    }

    // 2. Payment field hesitation (higher priority)
    if (data.currentField?.includes('payment') || data.currentField?.includes('card')) {
      const paymentTime = data.fieldTimings[data.currentField] || 0;
      if (paymentTime > this.THRESHOLDS.PAYMENT_HESITATION) {
        signals.push({
          type: 'PAYMENT_HESITATION',
          severity: 'high',
          field: data.currentField,
          duration: paymentTime,
        });
      }
    }

    // 3. Tab blur detection (comparison shopping)
    if (data.totalTabBlurTime > this.THRESHOLDS.TAB_BLUR_DURATION && data.tabBlurCount >= 2) {
      signals.push({
        type: 'COMPARISON_SHOPPING',
        severity: 'high',
        duration: data.totalTabBlurTime,
      });
    }

    // 4. Price shock detection
    if (data.totalViewDuration > this.THRESHOLDS.PRICE_SHOCK_TIME && data.scrollUpCount >= 2) {
      signals.push({
        type: 'PRICE_SHOCK',
        severity: 'high',
        duration: data.totalViewDuration,
      });
    }

    // 5. Back navigation (reconsideration)
    if (data.backNavigationCount >= 2) {
      signals.push({
        type: 'RECONSIDERATION',
        severity: 'medium',
        count: data.backNavigationCount,
      });
    }

    // 6. Multiple promo code attempts (price sensitivity)
    if (data.promoCodeAttempts >= 2) {
      signals.push({
        type: 'PROMO_SEEKING',
        severity: 'medium',
        count: data.promoCodeAttempts,
      });
    }

    // 7. Extended checkout time
    if (data.checkoutStartTime) {
      const checkoutDuration = now - data.checkoutStartTime;
      if (checkoutDuration > this.THRESHOLDS.TOTAL_CHECKOUT_TIME) {
        signals.push({
          type: 'EXTENDED_CHECKOUT',
          severity: 'low',
          duration: checkoutDuration,
        });
      }
    }

    // Calculate overall churn risk
    if (signals.length === 0) {
      return null;
    }

    const riskScore = this.calculateRiskScore(signals);
    const predictedReason = this.predictAbandonmentReason(signals, data);

    // Only alert if risk is significant
    if (riskScore < 40) {
      return null;
    }

    return {
      sessionId,
      signals,
      riskScore,
      predictedReason,
      suggestedIntervention: this.suggestIntervention(predictedReason, riskScore),
      timestamp: now,
    };
  }

  /**
   * Calculate overall churn risk score (0-100)
   */
  private calculateRiskScore(signals: ChurnSignal[]): number {
    const weights: Record<ChurnSignal['type'], number> = {
      PAYMENT_HESITATION: 30,
      PRICE_SHOCK: 25,
      COMPARISON_SHOPPING: 25,
      FIELD_HESITATION: 15,
      RECONSIDERATION: 15,
      PROMO_SEEKING: 10,
      EXTENDED_CHECKOUT: 5,
    };

    const severityMultipliers = {
      high: 1.0,
      medium: 0.7,
      low: 0.4,
    };

    let score = 0;
    for (const signal of signals) {
      const baseWeight = weights[signal.type] || 10;
      const multiplier = severityMultipliers[signal.severity];
      score += baseWeight * multiplier;
    }

    return Math.min(100, score);
  }

  /**
   * Predict the most likely abandonment reason
   */
  private predictAbandonmentReason(
    signals: ChurnSignal[],
    data: CheckoutSessionData,
  ): CartAbandonmentReason {
    const signalTypes = signals.map(s => s.type);

    if (signalTypes.includes('PRICE_SHOCK') || signalTypes.includes('PROMO_SEEKING')) {
      return CartAbandonmentReason.TOO_EXPENSIVE;
    }

    if (signalTypes.includes('COMPARISON_SHOPPING')) {
      return CartAbandonmentReason.COMPARING_OPTIONS;
    }

    if (signalTypes.includes('PAYMENT_HESITATION')) {
      return CartAbandonmentReason.PAYMENT_ISSUES;
    }

    if (data.promoCodeAttempts > 0) {
      return CartAbandonmentReason.TOO_EXPENSIVE;
    }

    if (signalTypes.includes('FIELD_HESITATION') && data.currentField?.includes('shipping')) {
      return CartAbandonmentReason.SHIPPING_COST;
    }

    return CartAbandonmentReason.JUST_BROWSING;
  }

  /**
   * Suggest intervention based on predicted reason
   */
  private suggestIntervention(
    reason: CartAbandonmentReason,
    riskScore: number,
  ): SuggestedIntervention {
    const interventions: Record<CartAbandonmentReason, SuggestedIntervention> = {
      [CartAbandonmentReason.TOO_EXPENSIVE]: {
        type: 'DISCOUNT_OFFER',
        message: 'Hesitating? Use code SAVE10 for 10% off!',
        urgency: riskScore > 70 ? 'immediate' : 'gentle',
        channel: 'POPUP',
      },
      [CartAbandonmentReason.SHIPPING_COST]: {
        type: 'FREE_SHIPPING',
        message: 'Free shipping on orders over $50!',
        urgency: 'gentle',
        channel: 'BANNER',
      },
      [CartAbandonmentReason.PAYMENT_ISSUES]: {
        type: 'TRUST_SIGNAL',
        message: 'Secure checkout • 30-day returns • 24/7 support',
        urgency: 'gentle',
        channel: 'INLINE',
      },
      [CartAbandonmentReason.COMPARING_OPTIONS]: {
        type: 'VALUE_PROP',
        message: 'Why customers choose us: Fast shipping, quality guarantee',
        urgency: 'gentle',
        channel: 'SIDEBAR',
      },
      [CartAbandonmentReason.NEED_MORE_INFO]: {
        type: 'CHAT_OFFER',
        message: 'Have questions? Chat with us!',
        urgency: 'gentle',
        channel: 'CHAT_WIDGET',
      },
      [CartAbandonmentReason.JUST_BROWSING]: {
        type: 'SAVE_CART',
        message: 'Save your cart for later?',
        urgency: 'gentle',
        channel: 'POPUP',
      },
      [CartAbandonmentReason.OTHER]: {
        type: 'SUPPORT_OFFER',
        message: 'Having trouble? We can help!',
        urgency: 'immediate',
        channel: 'CHAT_WIDGET',
      },
      [CartAbandonmentReason.SAVING_FOR_LATER]: {
        type: 'SAVE_CART',
        message: 'No pressure - we\'ll save your cart',
        urgency: 'gentle',
        channel: 'POPUP',
      },
    };

    return interventions[reason] || interventions[CartAbandonmentReason.JUST_BROWSING];
  }

  // ═══════════════════════════════════════════════════════════════
  // ALERT HANDLING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle detected churn alert
   */
  private async handleChurnAlert(
    sessionId: string,
    alert: ChurnAlert,
  ): Promise<void> {
    // Get session to find cart and company
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken: sessionId },
      include: {
        cart: {
          include: {
            items: true,
          },
        },
        funnel: true,
      },
    });

    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return;
    }

    // Get companyId from funnel
    const companyId = session.funnel.companyId;

    // Cart is optional - if no cart, we can still emit alert with session data
    const cartId = session.cart?.id ?? null;

    // Emit event for real-time intervention
    this.eventEmitter.emit('checkout.churn.detected', {
      sessionId,
      cartId,
      companyId,
      alert,
    });

    // If high risk and we have a cart, initiate cart save flow
    if (alert.riskScore >= 70 && cartId) {
      await this.cartSaveService.initiateCartSaveFlow(
        cartId,
        alert.predictedReason,
      );

      // Log for analytics (only if we have a cart)
      await this.prisma.cartSaveAttempt.create({
        data: {
          cartId,
          companyId,
          currentStage: CartSaveStage.PATTERN_INTERRUPT,
          status: 'ACTIVE',
          diagnosisReason: alert.predictedReason,
          cartValue: 0,
          metadata: {
            type: 'churn_detection',
            signals: JSON.parse(JSON.stringify(alert.signals)),
            riskScore: alert.riskScore,
            suggestedIntervention: JSON.parse(JSON.stringify(alert.suggestedIntervention)),
            channelsUsed: ['REALTIME'],
          },
        },
      });
    }

    this.logger.log(
      `Churn alert for session ${sessionId}: risk=${alert.riskScore}, reason=${alert.predictedReason}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CS AI INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Escalate to CS AI for proactive chat intervention
   */
  async escalateToCSAI(
    sessionId: string,
    alert: ChurnAlert,
  ): Promise<{ escalated: boolean; chatSessionId?: string }> {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken: sessionId },
      include: {
        cart: {
          include: {
            customer: true,
            items: true,
          },
        },
        funnel: true,
      },
    });

    if (!session) {
      return { escalated: false };
    }

    // Get customer - either from cart or from lead
    const customerId = session.cart?.customer?.id ?? session.leadId;
    if (!customerId) {
      return { escalated: false };
    }

    // Calculate cart value if cart exists
    const cartValue = session.cart?.items?.reduce(
      (sum, item) => sum + (item.quantity * Number(item.unitPrice) || 0),
      0,
    ) ?? 0;

    // Create CS AI session with context (includes metadata fields since CSSession doesn't have metadata)
    const csSession = await this.prisma.cSSession.create({
      data: {
        companyId: session.funnel.companyId,
        customerId,
        channel: 'CHAT',
        currentTier: 'AI_REP',
        status: 'ACTIVE',
        context: {
          type: 'PROACTIVE_CHECKOUT_HELP',
          churnRisk: alert.riskScore,
          predictedReason: alert.predictedReason,
          cartValue,
          suggestedApproach: JSON.parse(JSON.stringify(alert.suggestedIntervention)),
          // Additional context (moved from metadata since CSSession doesn't have that field)
          cartId: session.cart?.id ?? null,
          sessionId,
          initiatedBy: 'churn_detection',
        },
      },
    });

    // Create initial proactive message
    await this.prisma.cSMessage.create({
      data: {
        sessionId: csSession.id,
        role: 'ASSISTANT',
        content: this.generateProactiveMessage(alert),
        metadata: {
          proactive: true,
          triggerReason: alert.predictedReason,
        },
      },
    });

    this.eventEmitter.emit('cs.session.proactive', {
      sessionId: csSession.id,
      customerId,
      reason: 'checkout_churn_risk',
    });

    return { escalated: true, chatSessionId: csSession.id };
  }

  /**
   * Generate proactive chat message based on churn signal
   */
  private generateProactiveMessage(alert: ChurnAlert): string {
    const messages: Record<CartAbandonmentReason, string> = {
      [CartAbandonmentReason.TOO_EXPENSIVE]:
        "Hey there! 👋 I noticed you might be looking for the best deal. I might be able to help with a special offer - interested?",
      [CartAbandonmentReason.SHIPPING_COST]:
        "Hi! 👋 Have questions about shipping? I'm here to help - we have some great options!",
      [CartAbandonmentReason.PAYMENT_ISSUES]:
        "Hello! 👋 I wanted to let you know we're here to help if you have any questions about your order. We've got secure checkout and easy returns!",
      [CartAbandonmentReason.COMPARING_OPTIONS]:
        "Hi there! 👋 I see you're doing some research - smart! Can I answer any questions to help you decide?",
      [CartAbandonmentReason.NEED_MORE_INFO]:
        "Hey! 👋 Have questions about what you're looking at? I'd love to help you find the perfect fit!",
      [CartAbandonmentReason.JUST_BROWSING]:
        "Hi! 👋 Just wanted to check in - let me know if you need any help!",
      [CartAbandonmentReason.OTHER]:
        "Hello! 👋 Running into any issues? I'm here to help get you sorted!",
      [CartAbandonmentReason.SAVING_FOR_LATER]:
        "Hi there! 👋 No pressure at all - but if there's anything I can help with, just let me know!",
    };

    return messages[alert.predictedReason] || messages[CartAbandonmentReason.JUST_BROWSING];
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION DATA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  private async getOrCreateSessionData(sessionId: string): Promise<CheckoutSessionData> {
    const session = await this.prisma.funnelSession.findUnique({
      where: { sessionToken: sessionId },
    });

    if (session?.checkoutBehavior) {
      return session.checkoutBehavior as unknown as CheckoutSessionData;
    }

    return this.createEmptySessionData();
  }

  private createEmptySessionData(): CheckoutSessionData {
    return {
      currentField: null,
      lastFieldFocusTime: null,
      fieldHistory: [],
      fieldTimings: {},
      tabBlurTime: null,
      tabBlurCount: 0,
      totalTabBlurTime: 0,
      scrollUpCount: 0,
      lastScrollUpTime: null,
      totalViewedAt: null,
      totalViewDuration: 0,
      backNavigationCount: 0,
      paymentMethodChanges: 0,
      promoCodeAttempts: 0,
      lastPromoAttempt: null,
      checkoutStartTime: null,
      currentStep: null,
      stepHistory: [],
    };
  }

  private async updateSessionData(
    sessionId: string,
    data: CheckoutSessionData,
  ): Promise<void> {
    await this.prisma.funnelSession.update({
      where: { sessionToken: sessionId },
      data: {
        checkoutBehavior: data as any,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CheckoutEvent {
  type:
    | 'FIELD_FOCUS'
    | 'FIELD_BLUR'
    | 'TAB_BLUR'
    | 'TAB_FOCUS'
    | 'SCROLL_UP'
    | 'TOTAL_VIEWED'
    | 'BACK_NAVIGATION'
    | 'PAYMENT_METHOD_CHANGED'
    | 'PROMO_CODE_ATTEMPT'
    | 'CHECKOUT_STARTED'
    | 'CHECKOUT_STEP_CHANGED';
  field?: string;
  step?: string;
  duration?: number;
  promoCode?: string;
  timestamp?: number;
}

interface CheckoutSessionData {
  currentField: string | null;
  lastFieldFocusTime: number | null;
  fieldHistory: { field: string; timestamp: number }[];
  fieldTimings: Record<string, number>;
  tabBlurTime: number | null;
  tabBlurCount: number;
  totalTabBlurTime: number;
  scrollUpCount: number;
  lastScrollUpTime: number | null;
  totalViewedAt: number | null;
  totalViewDuration: number;
  backNavigationCount: number;
  paymentMethodChanges: number;
  promoCodeAttempts: number;
  lastPromoAttempt: string | null;
  checkoutStartTime: number | null;
  currentStep: string | null;
  stepHistory: { step: string; timestamp: number }[];
}

interface ChurnSignal {
  type:
    | 'FIELD_HESITATION'
    | 'PAYMENT_HESITATION'
    | 'COMPARISON_SHOPPING'
    | 'PRICE_SHOCK'
    | 'RECONSIDERATION'
    | 'PROMO_SEEKING'
    | 'EXTENDED_CHECKOUT';
  severity: 'low' | 'medium' | 'high';
  field?: string | null;
  duration?: number;
  count?: number;
}

export interface ChurnAlert {
  sessionId: string;
  signals: ChurnSignal[];
  riskScore: number;
  predictedReason: CartAbandonmentReason;
  suggestedIntervention: SuggestedIntervention;
  timestamp: number;
}

interface SuggestedIntervention {
  type:
    | 'DISCOUNT_OFFER'
    | 'FREE_SHIPPING'
    | 'TRUST_SIGNAL'
    | 'VALUE_PROP'
    | 'CHAT_OFFER'
    | 'SAVE_CART'
    | 'SUPPORT_OFFER';
  message: string;
  urgency: 'immediate' | 'gentle';
  channel: 'POPUP' | 'BANNER' | 'INLINE' | 'SIDEBAR' | 'CHAT_WIDGET';
}
