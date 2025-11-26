import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IntentCategory,
  CancelReason,
  SentimentLevel,
  UrgencyLevel,
  IntentDetectionResult,
  IntentDetectionContext,
  DetectIntentDto,
  IntentDetectedEvent,
} from './types/intent.types';

@Injectable()
export class EnhancedIntentDetectionService {
  private readonly logger = new Logger(EnhancedIntentDetectionService.name);

  // Intent keywords mapping
  private readonly intentKeywords: Record<IntentCategory, string[]> = {
    [IntentCategory.CANCEL]: [
      'cancel',
      'unsubscribe',
      'stop',
      'end subscription',
      'terminate',
      'close account',
      'delete account',
      'quit',
      'discontinue',
      'opt out',
    ],
    [IntentCategory.PAUSE]: [
      'pause',
      'hold',
      'skip',
      'delay',
      'suspend',
      'temporarily stop',
      'take a break',
      'freeze',
      'put on hold',
    ],
    [IntentCategory.DOWNGRADE]: [
      'downgrade',
      'cheaper plan',
      'lower tier',
      'reduce',
      'less expensive',
      'basic plan',
      'switch to lower',
      'cut back',
    ],
    [IntentCategory.UPGRADE]: [
      'upgrade',
      'premium',
      'more features',
      'higher tier',
      'better plan',
      'add more',
      'increase',
      'expand',
    ],
    [IntentCategory.COMPLAINT]: [
      'complaint',
      'unhappy',
      'disappointed',
      'frustrated',
      'angry',
      'not working',
      'terrible',
      'awful',
      'worst',
      'unacceptable',
    ],
    [IntentCategory.QUESTION]: [
      'how do',
      'what is',
      'can i',
      'where is',
      'when will',
      'help me',
      'explain',
      'tell me',
      'show me',
    ],
    [IntentCategory.PAYMENT_ISSUE]: [
      'payment failed',
      'card declined',
      'billing error',
      'charged twice',
      'wrong amount',
      'refund',
      'overcharged',
    ],
    [IntentCategory.BILLING_QUESTION]: [
      'bill',
      'invoice',
      'charge',
      'payment',
      'receipt',
      'statement',
    ],
    [IntentCategory.FEEDBACK]: [
      'feedback',
      'suggestion',
      'idea',
      'recommend',
      'improve',
    ],
    [IntentCategory.RENEW]: ['renew', 'continue', 'keep', 'stay', 'extend'],
    [IntentCategory.REFERRAL]: ['refer', 'friend', 'share', 'recommend to'],
    [IntentCategory.NEUTRAL]: [],
    [IntentCategory.UNKNOWN]: [],
  };

  // Cancel reason keywords
  private readonly cancelReasonKeywords: Record<CancelReason, string[]> = {
    [CancelReason.TOO_EXPENSIVE]: [
      'expensive',
      'cost',
      'price',
      'afford',
      'budget',
      'money',
      'cheap',
      'too much',
      'pricey',
      'overpriced',
    ],
    [CancelReason.NOT_USING]: [
      'not using',
      "don't use",
      'never use',
      'forgot',
      'unused',
      'sitting there',
      'pile up',
      'too much coffee',
    ],
    [CancelReason.WRONG_PRODUCT]: [
      "don't like",
      'taste',
      'flavor',
      'wrong',
      'not for me',
      'prefer different',
      'not what i expected',
    ],
    [CancelReason.BAD_EXPERIENCE]: [
      'bad experience',
      'terrible',
      'awful',
      'worst',
      'horrible',
      'disappointed',
      'let down',
    ],
    [CancelReason.COMPETITOR]: [
      'found another',
      'competitor',
      'switch to',
      'better option',
      'alternative',
      'somewhere else',
    ],
    [CancelReason.TEMPORARY_PAUSE]: [
      'temporary',
      'for now',
      'come back',
      'vacation',
      'traveling',
      'moving',
      'busy',
    ],
    [CancelReason.FINANCIAL_HARDSHIP]: [
      'lost job',
      'financial',
      'hard times',
      'struggling',
      "can't afford",
      'tight budget',
    ],
    [CancelReason.TECHNICAL_ISSUES]: [
      'technical',
      'bug',
      'error',
      "doesn't work",
      'broken',
      'glitch',
    ],
    [CancelReason.SHIPPING_ISSUES]: [
      'shipping',
      'delivery',
      'late',
      'damaged',
      'lost package',
      'never arrived',
    ],
    [CancelReason.QUALITY_ISSUES]: [
      'quality',
      'stale',
      'old',
      'bad batch',
      'inconsistent',
    ],
    [CancelReason.TOO_MUCH_PRODUCT]: [
      'too much',
      'pile up',
      'backlog',
      "can't finish",
      'overwhelmed',
    ],
    [CancelReason.LIFESTYLE_CHANGE]: [
      'lifestyle',
      'diet',
      'health',
      'doctor',
      'caffeine',
      'pregnant',
    ],
    [CancelReason.MOVING]: ['moving', 'relocating', 'new address', 'different country'],
    [CancelReason.GIFTING_ENDED]: [
      'gift',
      'present',
      'for someone else',
      'gifted',
    ],
    [CancelReason.OTHER]: [],
  };

  // Sentiment keywords
  private readonly sentimentKeywords = {
    veryNegative: [
      'hate',
      'terrible',
      'awful',
      'worst',
      'horrible',
      'disgusting',
      'furious',
    ],
    negative: [
      'bad',
      'poor',
      'disappointed',
      'unhappy',
      'frustrated',
      'annoyed',
      'upset',
    ],
    positive: ['good', 'nice', 'happy', 'pleased', 'satisfied', 'enjoy', 'like'],
    veryPositive: [
      'love',
      'amazing',
      'excellent',
      'fantastic',
      'wonderful',
      'perfect',
      'best',
    ],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // MAIN DETECTION METHOD
  // ═══════════════════════════════════════════════════════════════

  async detectIntent(dto: DetectIntentDto): Promise<IntentDetectionResult> {
    this.logger.debug(`Detecting intent for customer ${dto.customerId}`);

    // Build context
    const context = await this.buildContext(dto);

    // Analyze text (from input or transcript)
    const textToAnalyze = dto.text || dto.transcript || '';

    // Detect primary intent
    const { intent: primaryIntent, confidence: primaryConfidence } =
      this.detectPrimaryIntent(textToAnalyze, context);

    // Detect secondary intents
    const secondaryIntents = this.detectSecondaryIntents(
      textToAnalyze,
      primaryIntent,
    );

    // Detect cancel reason if applicable
    let cancelReason: CancelReason | undefined;
    let cancelReasonConfidence: number | undefined;

    if (
      primaryIntent === IntentCategory.CANCEL ||
      primaryIntent === IntentCategory.PAUSE
    ) {
      const reasonResult = this.detectCancelReason(textToAnalyze);
      cancelReason = reasonResult.reason;
      cancelReasonConfidence = reasonResult.confidence;
    }

    // Analyze sentiment
    const { sentiment, sentimentScore } = this.analyzeSentiment(textToAnalyze);

    // Determine urgency
    const urgency = this.determineUrgency(primaryIntent, sentiment, context);

    const result: IntentDetectionResult = {
      customerId: dto.customerId,
      sessionId: dto.sessionId,
      primaryIntent,
      primaryConfidence,
      secondaryIntents,
      cancelReason,
      cancelReasonConfidence,
      sentiment,
      sentimentScore,
      urgency,
      source: dto.source,
      sourceData: dto.metadata,
      detectedAt: new Date(),
    };

    // Store detection result
    await this.storeDetectionResult(dto.companyId, result);

    // Emit event
    const shouldTrigger = this.shouldTriggerIntervention(result);
    const event: IntentDetectedEvent = {
      detection: result,
      shouldTriggerIntervention: shouldTrigger,
      interventionType: shouldTrigger
        ? this.getInterventionType(result)
        : undefined,
    };
    this.eventEmitter.emit('intent.detected', event);

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // INTENT DETECTION HELPERS
  // ═══════════════════════════════════════════════════════════════

  private detectPrimaryIntent(
    text: string,
    context: IntentDetectionContext,
  ): { intent: IntentCategory; confidence: number } {
    const lowerText = text.toLowerCase();
    let maxScore = 0;
    let detectedIntent = IntentCategory.UNKNOWN;

    // Check page-based intent first (highest confidence)
    if (context.currentPage?.includes('cancel')) {
      return { intent: IntentCategory.CANCEL, confidence: 0.9 };
    }
    if (
      context.currentPage?.includes('pause') ||
      context.currentPage?.includes('skip')
    ) {
      return { intent: IntentCategory.PAUSE, confidence: 0.85 };
    }

    // Keyword-based detection
    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      const score = this.calculateKeywordScore(lowerText, keywords);
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent as IntentCategory;
      }
    }

    // If no strong signal, return neutral or unknown
    if (maxScore < 0.3) {
      return { intent: IntentCategory.NEUTRAL, confidence: 0.5 };
    }

    return { intent: detectedIntent, confidence: Math.min(maxScore, 0.95) };
  }

  private detectSecondaryIntents(
    text: string,
    primaryIntent: IntentCategory,
  ): Array<{ intent: IntentCategory; confidence: number }> {
    const lowerText = text.toLowerCase();
    const secondaryIntents: Array<{
      intent: IntentCategory;
      confidence: number;
    }> = [];

    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      if (
        intent === primaryIntent ||
        intent === IntentCategory.NEUTRAL ||
        intent === IntentCategory.UNKNOWN
      ) {
        continue;
      }

      const score = this.calculateKeywordScore(lowerText, keywords);
      if (score > 0.2) {
        secondaryIntents.push({
          intent: intent as IntentCategory,
          confidence: Math.min(score * 0.8, 0.7), // Secondary intents have lower max confidence
        });
      }
    }

    return secondaryIntents
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 secondary intents
  }

  private detectCancelReason(
    text: string,
  ): { reason: CancelReason; confidence: number } {
    const lowerText = text.toLowerCase();
    let maxScore = 0;
    let detectedReason = CancelReason.OTHER;

    for (const [reason, keywords] of Object.entries(
      this.cancelReasonKeywords,
    )) {
      const score = this.calculateKeywordScore(lowerText, keywords);
      if (score > maxScore) {
        maxScore = score;
        detectedReason = reason as CancelReason;
      }
    }

    return {
      reason: detectedReason,
      confidence: Math.min(maxScore, 0.9),
    };
  }

  private analyzeSentiment(
    text: string,
  ): { sentiment: SentimentLevel; sentimentScore: number } {
    const lowerText = text.toLowerCase();
    let score = 0;

    // Very negative
    for (const keyword of this.sentimentKeywords.veryNegative) {
      if (lowerText.includes(keyword)) score -= 0.4;
    }
    // Negative
    for (const keyword of this.sentimentKeywords.negative) {
      if (lowerText.includes(keyword)) score -= 0.2;
    }
    // Positive
    for (const keyword of this.sentimentKeywords.positive) {
      if (lowerText.includes(keyword)) score += 0.2;
    }
    // Very positive
    for (const keyword of this.sentimentKeywords.veryPositive) {
      if (lowerText.includes(keyword)) score += 0.4;
    }

    // Clamp score between -1 and 1
    score = Math.max(-1, Math.min(1, score));

    let sentiment: SentimentLevel;
    if (score <= -0.5) sentiment = SentimentLevel.VERY_NEGATIVE;
    else if (score <= -0.2) sentiment = SentimentLevel.NEGATIVE;
    else if (score >= 0.5) sentiment = SentimentLevel.VERY_POSITIVE;
    else if (score >= 0.2) sentiment = SentimentLevel.POSITIVE;
    else sentiment = SentimentLevel.NEUTRAL;

    return { sentiment, sentimentScore: score };
  }

  private determineUrgency(
    intent: IntentCategory,
    sentiment: SentimentLevel,
    context: IntentDetectionContext,
  ): UrgencyLevel {
    // Cancel intent is always high urgency
    if (intent === IntentCategory.CANCEL) {
      if (sentiment === SentimentLevel.VERY_NEGATIVE)
        return UrgencyLevel.CRITICAL;
      return UrgencyLevel.HIGH;
    }

    // High-value customers get higher urgency
    if (
      context.customer?.lifetimeValue &&
      context.customer.lifetimeValue > 500
    ) {
      if (intent === IntentCategory.COMPLAINT) return UrgencyLevel.HIGH;
      if (intent === IntentCategory.PAUSE) return UrgencyLevel.HIGH;
    }

    // Payment issues are always medium+ urgency
    if (intent === IntentCategory.PAYMENT_ISSUE) {
      return UrgencyLevel.HIGH;
    }

    // Default urgency based on intent
    switch (intent) {
      case IntentCategory.COMPLAINT:
        return sentiment === SentimentLevel.VERY_NEGATIVE
          ? UrgencyLevel.HIGH
          : UrgencyLevel.MEDIUM;
      case IntentCategory.PAUSE:
      case IntentCategory.DOWNGRADE:
        return UrgencyLevel.MEDIUM;
      default:
        return UrgencyLevel.LOW;
    }
  }

  private calculateKeywordScore(text: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;

    let matches = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matches++;
        // Exact phrase matches get bonus
        if (
          text.includes(` ${keyword} `) ||
          text.startsWith(`${keyword} `) ||
          text.endsWith(` ${keyword}`)
        ) {
          matches += 0.5;
        }
      }
    }

    return Math.min(matches / Math.sqrt(keywords.length), 1);
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT & STORAGE
  // ═══════════════════════════════════════════════════════════════

  private async buildContext(
    dto: DetectIntentDto,
  ): Promise<IntentDetectionContext> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const tenureMonths = customer
      ? Math.floor(
          (Date.now() - customer.createdAt.getTime()) /
            (30 * 24 * 60 * 60 * 1000),
        )
      : 0;

    const lifetimeValue =
      customer?.orders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      ) || 0;

    return {
      customerId: dto.customerId,
      companyId: dto.companyId,
      sessionId: dto.sessionId,
      currentPage: dto.currentPage,
      currentAction: dto.currentAction,
      text: dto.text,
      transcript: dto.transcript,
      customer: customer
        ? {
            tenureMonths,
            lifetimeValue,
            currentPlan: customer.subscriptions[0]?.planName,
            subscriptionStatus: customer.subscriptions[0]?.status,
          }
        : undefined,
    };
  }

  private async storeDetectionResult(
    companyId: string,
    result: IntentDetectionResult,
  ): Promise<void> {
    await this.prisma.intentDetection.create({
      data: {
        companyId,
        customerId: result.customerId,
        sessionId: result.sessionId,
        primaryIntent: result.primaryIntent,
        primaryConfidence: result.primaryConfidence,
        secondaryIntents: result.secondaryIntents,
        cancelReason: result.cancelReason,
        cancelReasonConfidence: result.cancelReasonConfidence,
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        urgency: result.urgency,
        source: result.source,
        sourceData: result.sourceData as any,
        detectedAt: result.detectedAt,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERVENTION TRIGGERS
  // ═══════════════════════════════════════════════════════════════

  private shouldTriggerIntervention(result: IntentDetectionResult): boolean {
    // Always trigger for cancel intent
    if (
      result.primaryIntent === IntentCategory.CANCEL &&
      result.primaryConfidence > 0.5
    ) {
      return true;
    }

    // Trigger for pause/downgrade with high confidence
    if (
      (result.primaryIntent === IntentCategory.PAUSE ||
        result.primaryIntent === IntentCategory.DOWNGRADE) &&
      result.primaryConfidence > 0.6
    ) {
      return true;
    }

    // Trigger for complaints with negative sentiment
    if (
      result.primaryIntent === IntentCategory.COMPLAINT &&
      (result.sentiment === SentimentLevel.NEGATIVE ||
        result.sentiment === SentimentLevel.VERY_NEGATIVE)
    ) {
      return true;
    }

    // Trigger for payment issues
    if (result.primaryIntent === IntentCategory.PAYMENT_ISSUE) {
      return true;
    }

    return false;
  }

  private getInterventionType(result: IntentDetectionResult): string {
    switch (result.primaryIntent) {
      case IntentCategory.CANCEL:
        return 'save_flow';
      case IntentCategory.PAUSE:
        return 'pause_offer';
      case IntentCategory.DOWNGRADE:
        return 'retention_offer';
      case IntentCategory.COMPLAINT:
        return 'support_escalation';
      case IntentCategory.PAYMENT_ISSUE:
        return 'payment_recovery';
      default:
        return 'general';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERY METHODS
  // ═══════════════════════════════════════════════════════════════

  async getRecentDetections(
    companyId: string,
    options?: {
      customerId?: string;
      intent?: IntentCategory;
      limit?: number;
    },
  ): Promise<IntentDetectionResult[]> {
    const detections = await this.prisma.intentDetection.findMany({
      where: {
        companyId,
        ...(options?.customerId && { customerId: options.customerId }),
        ...(options?.intent && { primaryIntent: options.intent }),
      },
      orderBy: { detectedAt: 'desc' },
      take: options?.limit || 50,
    });

    return detections.map((d) => ({
      customerId: d.customerId,
      sessionId: d.sessionId ?? undefined,
      primaryIntent: d.primaryIntent as IntentCategory,
      primaryConfidence: d.primaryConfidence,
      secondaryIntents: d.secondaryIntents as any,
      cancelReason: d.cancelReason as CancelReason | undefined,
      cancelReasonConfidence: d.cancelReasonConfidence ?? undefined,
      sentiment: d.sentiment as SentimentLevel,
      sentimentScore: d.sentimentScore,
      urgency: d.urgency as UrgencyLevel,
      source: d.source as 'web' | 'voice' | 'chat' | 'email' | 'api',
      sourceData: d.sourceData as any,
      detectedAt: d.detectedAt,
    }));
  }

  async getIntentStats(
    companyId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<{
    totalDetections: number;
    byIntent: Record<string, number>;
    bySentiment: Record<string, number>;
    byUrgency: Record<string, number>;
    cancelReasons: Record<string, number>;
  }> {
    const where = {
      companyId,
      ...(dateRange && {
        detectedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const detections = await this.prisma.intentDetection.findMany({
      where,
      select: {
        primaryIntent: true,
        sentiment: true,
        urgency: true,
        cancelReason: true,
      },
    });

    const byIntent: Record<string, number> = {};
    const bySentiment: Record<string, number> = {};
    const byUrgency: Record<string, number> = {};
    const cancelReasons: Record<string, number> = {};

    for (const d of detections) {
      byIntent[d.primaryIntent] = (byIntent[d.primaryIntent] || 0) + 1;
      bySentiment[d.sentiment] = (bySentiment[d.sentiment] || 0) + 1;
      byUrgency[d.urgency] = (byUrgency[d.urgency] || 0) + 1;
      if (d.cancelReason) {
        cancelReasons[d.cancelReason] =
          (cancelReasons[d.cancelReason] || 0) + 1;
      }
    }

    return {
      totalDetections: detections.length,
      byIntent,
      bySentiment,
      byUrgency,
      cancelReasons,
    };
  }
}
