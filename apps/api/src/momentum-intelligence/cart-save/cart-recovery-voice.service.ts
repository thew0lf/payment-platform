import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VoiceAIService } from '../voice-ai/voice-ai.service';
import { CartSaveService } from './cart-save.service';
import { CartAbandonmentReason, CartSaveStage, CartSaveStatus } from './types/cart-save.types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CartInterventionStatus, VoiceScriptType } from '@prisma/client';

/**
 * CartRecoveryVoiceService
 *
 * Integrates Voice AI capabilities with the Cart Save flow for
 * abandoned cart recovery via automated voice calls.
 *
 * Recovery Flow:
 * 1. Cart is abandoned (detected by behavioral triggers)
 * 2. System initiates recovery call via Twilio
 * 3. AI agent conducts diagnosis survey
 * 4. Based on reason, offers targeted intervention
 * 5. Outcome tracked and analyzed
 */
@Injectable()
export class CartRecoveryVoiceService {
  private readonly logger = new Logger(CartRecoveryVoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voiceAiService: VoiceAIService,
    private readonly cartSaveService: CartSaveService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // VOICE RECOVERY INITIATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initiate a voice recovery call for an abandoned cart
   */
  async initiateVoiceRecovery(
    companyId: string,
    cartId: string,
    options?: {
      delay?: number; // Minutes to wait before calling
      priority?: 'high' | 'normal' | 'low';
      scriptId?: string;
    },
  ): Promise<{ success: boolean; callId?: string; scheduledAt?: Date }> {
    // Get cart with customer info
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!cart || !cart.customer?.phone) {
      this.logger.warn(`Cannot initiate voice recovery: Cart ${cartId} not found or no phone number`);
      return { success: false };
    }

    // Check if voice recovery is enabled for this company
    const config = await this.cartSaveService.getFlowConfig(companyId);
    if (!config.stages.voiceRecovery?.enabled) {
      this.logger.log(`Voice recovery disabled for company ${companyId}`);
      return { success: false };
    }

    // Check time blackout (don't call during quiet hours)
    if (this.isInBlackoutPeriod(config.blackoutHours)) {
      const nextCallTime = this.getNextAvailableTime(config.blackoutHours);
      this.logger.log(`Scheduling voice recovery for ${nextCallTime} (outside blackout hours)`);

      // Schedule for later
      await this.scheduleVoiceRecovery(companyId, cartId, nextCallTime);
      return { success: true, scheduledAt: nextCallTime };
    }

    // Check max attempts - filter by voice channel via metadata
    const existingAttempts = await this.prisma.cartSaveAttempt.count({
      where: {
        cartId,
        currentStage: CartSaveStage.VOICE_RECOVERY,
      },
    });

    if (existingAttempts >= (config.maxAttemptsPerCart || 3)) {
      this.logger.log(`Max voice recovery attempts reached for cart ${cartId}`);
      return { success: false };
    }

    // Get or create voice script
    const scriptId = options?.scriptId || await this.getCartRecoveryScriptId(companyId);

    try {
      // Initiate the call
      const call = await this.voiceAiService.initiateOutboundCall(
        companyId,
        cart.customer.id,
        scriptId,
        options?.priority,
      );

      // Create cart save attempt record
      const cartValue = cart.items.reduce(
        (sum, item) => sum + (Number(item.unitPrice) * item.quantity),
        0,
      );
      const attempt = await this.prisma.cartSaveAttempt.create({
        data: {
          cartId,
          companyId,
          customerId: cart.customer.id,
          currentStage: CartSaveStage.VOICE_RECOVERY,
          status: CartSaveStatus.ACTIVE,
          cartValue,
          metadata: {
            callId: call.id,
            twilioCallSid: call.twilioCallSid,
            channel: 'VOICE',
            itemCount: cart.items.length,
          },
        },
      });

      this.eventEmitter.emit('cart.voice.recovery.initiated', {
        companyId,
        cartId,
        customerId: cart.customer.id,
        attemptId: attempt.id,
        callId: call.id,
      });

      this.logger.log(`Voice recovery initiated for cart ${cartId}, call ${call.id}`);

      return { success: true, callId: call.id };
    } catch (error) {
      this.logger.error(`Failed to initiate voice recovery for cart ${cartId}:`, error);
      return { success: false };
    }
  }

  /**
   * Schedule a voice recovery call for later
   */
  private async scheduleVoiceRecovery(
    companyId: string,
    cartId: string,
    scheduledTime: Date,
  ): Promise<void> {
    await this.prisma.cartSaveAttempt.create({
      data: {
        cartId,
        companyId,
        currentStage: CartSaveStage.VOICE_RECOVERY,
        status: CartSaveStatus.PAUSED,
        cartValue: 0, // Will be updated when call is made
        metadata: {
          channel: 'VOICE',
          scheduled: true,
          scheduledFor: scheduledTime.toISOString(),
        },
      },
    });

    this.eventEmitter.emit('cart.voice.recovery.scheduled', {
      companyId,
      cartId,
      scheduledTime,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // VOICE SCRIPT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get or create a cart recovery voice script for the company
   */
  private async getCartRecoveryScriptId(companyId: string): Promise<string> {
    // Look for existing cart recovery script
    const existingScript = await this.prisma.voiceScript.findFirst({
      where: {
        companyId,
        type: VoiceScriptType.OUTBOUND_SAVE,
        isActive: true,
      },
    });

    if (existingScript) {
      return existingScript.id;
    }

    // Create default cart recovery script
    const script = await this.prisma.voiceScript.create({
      data: {
        companyId,
        name: 'Cart Recovery - Default',
        type: VoiceScriptType.OUTBOUND_SAVE,
        isActive: true,
        isDefault: true,
        opening: {
          greeting: "Hi there! This is a quick call about the items you were checking out earlier. We noticed you didn't complete your purchase and wanted to make sure everything was okay.",
          confirmCustomer: true,
        },
        diagnosis: {
          primaryQuestion: "Was there anything that held you back from completing your order today?",
          followUpQuestions: [
            {
              trigger: 'price|expensive|cost|afford',
              question: "I totally understand - budget matters. Would it help if I could offer you a special discount to make it more affordable?",
            },
            {
              trigger: 'shipping|delivery',
              question: "Got it - shipping can be a factor. Let me check if we have any shipping offers available for you.",
            },
            {
              trigger: 'later|busy|time',
              question: "No problem at all! Would you like me to save your cart and send you a reminder? I can also set up a special offer that'll be waiting for you.",
            },
            {
              trigger: 'compare|other|looking',
              question: "Smart move to compare options! Is there anything specific about our product you'd like me to clarify? I might be able to help you make a decision.",
            },
          ],
          sentimentResponses: {
            angry: "I'm really sorry to hear that. Let me see what I can do to make this right for you.",
            frustrated: "I understand your frustration. Let me help sort this out.",
            positive: "That's great to hear! Let me make sure your experience is even better.",
          },
        },
        interventions: [
          {
            condition: 'price_concern',
            response: "Great news - I can offer you 15% off your order right now. That brings your total down to a much better price. Would you like me to apply that?",
            offer: { type: 'PERCENTAGE_DISCOUNT', value: 15 },
          },
          {
            condition: 'shipping_issue',
            response: "I've got good news - I can offer you free shipping on this order. That should help! Want me to update your cart?",
            offer: { type: 'FREE_SHIPPING' },
          },
          {
            condition: 'needs_time',
            response: "Absolutely, I'll keep your cart saved. And as a thank you for chatting with me, I'm adding a 10% discount that'll be there when you're ready!",
            offer: { type: 'PERCENTAGE_DISCOUNT', value: 10 },
          },
          {
            condition: 'product_uncertainty',
            response: "I'd love to answer any questions you have about the product. And to help you decide, I can offer free returns within 30 days - zero risk!",
            offer: { type: 'EXTENDED_RETURNS' },
          },
        ],
        closing: {
          acceptOffer: "Wonderful! I've applied that to your account. You should receive a confirmation email shortly. Thanks so much for your time today!",
          declineOffer: "No problem at all! Your cart will stay saved for you. If you have any questions later, just give us a call. Have a great day!",
          escalateToHuman: "Let me connect you with a team member who can help further. One moment please.",
        },
        objectionHandling: {
          priceObjection: "I completely understand price is important. Let me see what special offers I can apply to your cart right now.",
          shippingObjection: "Shipping costs can add up. Let me check if we have any shipping promotions available for you.",
          timingObjection: "No rush at all! I can save your cart and send you a reminder. Would that work for you?",
          trustObjection: "That's a valid concern. We offer a 30-day money-back guarantee on all purchases. Zero risk.",
        },
        behavioralTriggers: {
          cartAbandonment: true,
          highValueCart: { enabled: true, threshold: 100 },
          repeatVisitor: { enabled: true, minVisits: 3 },
          priceDropAlert: true,
        },
      },
    });

    return script.id;
  }

  // ═══════════════════════════════════════════════════════════════
  // CALL OUTCOME PROCESSING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process the outcome of a voice recovery call
   */
  async processCallOutcome(
    callId: string,
    outcome: 'SAVED' | 'DECLINED' | 'NO_ANSWER' | 'VOICEMAIL' | 'CALLBACK_SCHEDULED',
    metadata?: {
      reason?: CartAbandonmentReason;
      offerAccepted?: string;
      nextAttemptTime?: Date;
    },
  ): Promise<void> {
    // Find the cart save attempt by call ID
    const attempts = await this.prisma.cartSaveAttempt.findMany({
      where: {
        metadata: {
          path: ['callId'],
          equals: callId,
        },
      },
    });

    if (attempts.length === 0) {
      this.logger.warn(`No cart save attempt found for call ${callId}`);
      return;
    }

    const attempt = attempts[0];

    // Update attempt status
    const newStatus = outcome === 'SAVED'
      ? CartSaveStatus.CONVERTED
      : outcome === 'DECLINED'
        ? CartSaveStatus.EXHAUSTED
        : CartSaveStatus.ACTIVE;

    await this.prisma.cartSaveAttempt.update({
      where: { id: attempt.id },
      data: {
        status: newStatus,
        diagnosisReason: metadata?.reason,
        completedAt: ['SAVED', 'DECLINED'].includes(outcome) ? new Date() : undefined,
        metadata: {
          ...(attempt.metadata as object),
          outcome,
          offerAccepted: metadata?.offerAccepted,
        },
      },
    });

    // If saved, record the conversion
    if (outcome === 'SAVED') {
      await this.prisma.cartIntervention.create({
        data: {
          cartId: attempt.cartId,
          cartSaveAttemptId: attempt.id,
          stage: CartSaveStage.VOICE_RECOVERY,
          channels: ['VOICE'],
          content: {
            type: 'VOICE_CALL',
            outcome,
            offerAccepted: metadata?.offerAccepted,
          },
          triggersUsed: ['voice_recovery'],
          status: CartInterventionStatus.CONVERTED,
          offerType: metadata?.offerAccepted,
          scheduledAt: new Date(),
          sentAt: new Date(),
          convertedAt: new Date(),
        },
      });

      this.eventEmitter.emit('cart.voice.recovery.converted', {
        companyId: attempt.companyId,
        cartId: attempt.cartId,
        attemptId: attempt.id,
        offerType: metadata?.offerAccepted,
      });
    }

    // If callback scheduled, create follow-up attempt
    if (outcome === 'CALLBACK_SCHEDULED' && metadata?.nextAttemptTime) {
      await this.scheduleVoiceRecovery(
        attempt.companyId,
        attempt.cartId,
        metadata.nextAttemptTime,
      );
    }

    this.logger.log(`Voice recovery call ${callId} completed with outcome: ${outcome}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get voice recovery analytics for a company
   */
  async getVoiceRecoveryAnalytics(
    companyId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<{
    totalCalls: number;
    answered: number;
    converted: number;
    conversionRate: number;
    totalRecovered: number;
    averageCallDuration: number;
    topDeclineReasons: { reason: string; count: number }[];
    successByTimeOfDay: { hour: number; rate: number }[];
  }> {
    const where: any = {
      companyId,
      currentStage: CartSaveStage.VOICE_RECOVERY,
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const attempts = await this.prisma.cartSaveAttempt.findMany({
      where,
      include: {
        cart: {
          include: {
            items: true,
          },
        },
      },
    });

    const totalCalls = attempts.length;
    const answered = attempts.filter(a =>
      !['NO_ANSWER', 'VOICEMAIL'].includes((a.metadata as any)?.outcome)
    ).length;
    const converted = attempts.filter(a => a.status === CartSaveStatus.CONVERTED).length;
    const conversionRate = totalCalls > 0 ? (converted / totalCalls) * 100 : 0;

    // Calculate total recovered value
    const totalRecovered = attempts
      .filter(a => a.status === CartSaveStatus.CONVERTED)
      .reduce((sum, a) => {
        const cartValue = a.cart?.items?.reduce(
          (itemSum, item) => itemSum + (Number(item.unitPrice) * item.quantity),
          0,
        ) ?? 0;
        return sum + cartValue;
      }, 0);

    // Get call durations from voice calls
    const callIds = attempts
      .map(a => (a.metadata as any)?.callId)
      .filter(Boolean);

    const voiceCalls = callIds.length > 0
      ? await this.prisma.voiceCall.findMany({
          where: { id: { in: callIds } },
          select: { duration: true, initiatedAt: true },
        })
      : [];

    const averageCallDuration = voiceCalls.length > 0
      ? voiceCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / voiceCalls.length
      : 0;

    // Top decline reasons
    const declineReasons = attempts
      .filter(a => a.status === CartSaveStatus.EXHAUSTED && a.diagnosisReason)
      .reduce((acc, a) => {
        const reason = a.diagnosisReason!;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topDeclineReasons = Object.entries(declineReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Success by time of day
    const successByHour: Record<number, { total: number; converted: number }> = {};
    for (let h = 0; h < 24; h++) {
      successByHour[h] = { total: 0, converted: 0 };
    }

    attempts.forEach(a => {
      const hour = new Date(a.createdAt).getHours();
      successByHour[hour].total++;
      if (a.status === CartSaveStatus.CONVERTED) {
        successByHour[hour].converted++;
      }
    });

    const successByTimeOfDay = Object.entries(successByHour).map(([hour, data]) => ({
      hour: parseInt(hour),
      rate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
    }));

    return {
      totalCalls,
      answered,
      converted,
      conversionRate,
      totalRecovered,
      averageCallDuration,
      topDeclineReasons,
      successByTimeOfDay,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private isInBlackoutPeriod(blackoutHours?: { start: number; end: number }): boolean {
    if (!blackoutHours) return false;

    const now = new Date();
    const currentHour = now.getHours();

    // Handle overnight blackout (e.g., 21:00 - 09:00)
    if (blackoutHours.start > blackoutHours.end) {
      return currentHour >= blackoutHours.start || currentHour < blackoutHours.end;
    }

    return currentHour >= blackoutHours.start && currentHour < blackoutHours.end;
  }

  private getNextAvailableTime(blackoutHours?: { start: number; end: number }): Date {
    if (!blackoutHours) return new Date();

    const now = new Date();
    const result = new Date(now);

    // Set to end of blackout period
    result.setHours(blackoutHours.end, 0, 0, 0);

    // If that's in the past for today, try tomorrow
    if (result <= now) {
      result.setDate(result.getDate() + 1);
    }

    return result;
  }
}
