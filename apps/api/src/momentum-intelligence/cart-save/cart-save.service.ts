import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CartSaveStage,
  CartAbandonmentReason,
  CartSaveStatus,
  CartSaveResponseType,
  CartSaveChannel,
  CartSaveFlowConfig,
  CartOffer,
  InterventionContent,
  StageHistoryEntry,
  CartSaveAttemptMetadata,
  DEFAULT_CART_SAVE_CONFIG,
  DIAGNOSIS_BRANCHES,
  CartInterventionType,
} from './types/cart-save.types';

interface CartWithDetails {
  id: string;
  companyId: string;
  customerId: string | null;
  grandTotal: number;
  itemCount: number;
  status: string;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    createdAt: Date;
  } | null;
  items: Array<{
    id: string;
    productSnapshot: Record<string, unknown>;
    unitPrice: number;
    quantity: number;
  }>;
}

@Injectable()
export class CartSaveService {
  private readonly logger = new Logger(CartSaveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Initiate save flow for an abandoned cart
   * @param cartId - Cart ID to initiate save flow for
   * @param reason - Optional abandonment reason if known
   * @param companyId - Optional company ID for authorization verification
   */
  async initiateCartSaveFlow(
    cartId: string,
    reason?: CartAbandonmentReason,
    companyId?: string,
  ): Promise<{ attemptId: string; stage: CartSaveStage }> {
    const cart = await this.getCartWithDetails(cartId);

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Verify cart belongs to the expected company (when companyId provided)
    if (companyId && cart.companyId !== companyId) {
      throw new NotFoundException('Cart not found');
    }

    // Check if already in active save flow
    const existingAttempt = await this.prisma.cartSaveAttempt.findFirst({
      where: {
        cartId,
        status: 'ACTIVE',
      },
    });

    if (existingAttempt) {
      return {
        attemptId: existingAttempt.id,
        stage: existingAttempt.currentStage as CartSaveStage,
      };
    }

    // Get config for company
    const config = await this.getFlowConfig(cart.companyId);

    // Determine starting stage
    const startStage = this.determineStartStage(cart, config);

    // Calculate customer risk score (simplified - would integrate with MI)
    const customerRiskScore = this.calculateRiskScore(cart);

    // Create save attempt
    const attempt = await this.prisma.cartSaveAttempt.create({
      data: {
        cartId,
        companyId: cart.companyId,
        customerId: cart.customerId,
        currentStage: startStage,
        diagnosisReason: reason,
        customerRiskScore,
        cartValue: cart.grandTotal,
        metadata: {
          itemCount: cart.itemCount,
          hasHighValueItems: this.hasHighValueItems(cart),
          customerLTV: 0, // Would be calculated from customer history
          offersPresented: [],
          channelsUsed: [],
        },
        stageHistory: [
          {
            stage: startStage,
            enteredAt: new Date().toISOString(),
          } satisfies StageHistoryEntry,
        ],
      },
    });

    this.logger.log(
      `Initiated cart save flow for cart ${cartId}, attempt ${attempt.id}`,
    );

    // Schedule first intervention (would use job queue in production)
    // await this.scheduleNextIntervention(attempt.id);

    return {
      attemptId: attempt.id,
      stage: startStage,
    };
  }

  /**
   * Progress to next stage based on customer response
   */
  async progressCartSaveFlow(
    attemptId: string,
    response?: {
      type: CartSaveResponseType;
      data?: Record<string, unknown>;
    },
  ): Promise<{ stage: CartSaveStage | null; status: CartSaveStatus }> {
    const attempt = await this.prisma.cartSaveAttempt.findUnique({
      where: { id: attemptId },
      include: {
        cart: true,
        interventions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Save attempt not found');
    }

    if (attempt.status !== 'ACTIVE') {
      return { stage: null, status: attempt.status as CartSaveStatus };
    }

    // Record response on latest intervention
    if (response && attempt.interventions[0]) {
      await this.prisma.cartIntervention.update({
        where: { id: attempt.interventions[0].id },
        data: {
          responseType: response.type,
          responseAt: new Date(),
          surveyAnswer:
            response.type === CartSaveResponseType.SURVEY_ANSWERED
              ? (response.data?.answer as string)
              : undefined,
        },
      });
    }

    // Check if cart was converted
    if (attempt.cart.status === 'CONVERTED') {
      await this.completeSaveFlow(attemptId, CartSaveStatus.CONVERTED);
      return { stage: null, status: CartSaveStatus.CONVERTED };
    }

    // Handle unsubscribe
    if (response?.type === CartSaveResponseType.UNSUBSCRIBED) {
      await this.completeSaveFlow(attemptId, CartSaveStatus.UNSUBSCRIBED);
      return { stage: null, status: CartSaveStatus.UNSUBSCRIBED };
    }

    // Get config and determine next stage
    const config = await this.getFlowConfig(attempt.companyId);
    const currentStage = attempt.currentStage as CartSaveStage;
    const nextStage = this.getNextStage(currentStage, config, response);

    if (!nextStage) {
      await this.completeSaveFlow(attemptId, CartSaveStatus.EXHAUSTED);
      return { stage: null, status: CartSaveStatus.EXHAUSTED };
    }

    // Update attempt with new stage
    const stageHistory = (attempt.stageHistory as unknown as StageHistoryEntry[]) || [];
    stageHistory.push({
      stage: nextStage,
      enteredAt: new Date().toISOString(),
      previousStage: currentStage,
      response: response?.type,
    });

    await this.prisma.cartSaveAttempt.update({
      where: { id: attemptId },
      data: {
        currentStage: nextStage,
        stageHistory: stageHistory as unknown as object,
        // Update diagnosis reason if survey was answered
        ...(response?.type === CartSaveResponseType.SURVEY_ANSWERED &&
        response.data?.answer
          ? { diagnosisReason: response.data.answer as string }
          : {}),
      },
    });

    this.logger.log(
      `Progressed attempt ${attemptId} from ${currentStage} to ${nextStage}`,
    );

    return { stage: nextStage, status: CartSaveStatus.ACTIVE };
  }

  /**
   * Execute intervention for current stage
   */
  async executeIntervention(
    attemptId: string,
  ): Promise<{ interventionId: string; channels: CartSaveChannel[] }> {
    const attempt = await this.prisma.cartSaveAttempt.findUnique({
      where: { id: attemptId },
      include: {
        cart: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Save attempt not found');
    }

    if (attempt.status !== 'ACTIVE') {
      throw new BadRequestException('Save attempt is not active');
    }

    const config = await this.getFlowConfig(attempt.companyId);
    const currentStage = attempt.currentStage as CartSaveStage;
    const stageConfig = this.getStageConfig(currentStage, config);

    if (!stageConfig?.enabled) {
      throw new BadRequestException(`Stage ${currentStage} is not enabled`);
    }

    // Generate intervention content
    const content = await this.generateInterventionContent(
      attempt as unknown as { cart: CartWithDetails; diagnosisReason: string | null; currentStage: string },
      stageConfig,
    );

    // Determine channels
    const channels = this.selectChannels(stageConfig);

    // Generate offer if applicable
    const offer = this.generateOffer(
      currentStage,
      stageConfig,
      attempt.diagnosisReason as CartAbandonmentReason | null,
    );

    // Create intervention record
    const intervention = await this.prisma.cartIntervention.create({
      data: {
        cartSaveAttemptId: attemptId,
        cartId: attempt.cartId,
        stage: currentStage,
        channels,
        content: content as unknown as object,
        triggersUsed: content.triggersApplied,
        offerCode: offer?.code,
        offerType: offer?.type,
        offerValue: offer?.value,
        offerExpiresAt: offer?.expiresAt,
        status: 'SCHEDULED',
        scheduledAt: new Date(),
      },
    });

    this.logger.log(
      `Created intervention ${intervention.id} for attempt ${attemptId}`,
    );

    // In production, this would trigger actual delivery via queue
    // await this.deliveryService.deliver(intervention, channels);

    return {
      interventionId: intervention.id,
      channels,
    };
  }

  /**
   * Record diagnosis survey answer
   */
  async recordDiagnosisAnswer(
    attemptId: string,
    reason: CartAbandonmentReason,
  ): Promise<void> {
    await this.progressCartSaveFlow(attemptId, {
      type: CartSaveResponseType.SURVEY_ANSWERED,
      data: { answer: reason },
    });
  }

  /**
   * Get cart save attempt status
   */
  async getAttemptStatus(attemptId: string): Promise<{
    status: CartSaveStatus;
    currentStage: CartSaveStage | null;
    interventionCount: number;
    startedAt: Date;
    completedAt: Date | null;
  }> {
    const attempt = await this.prisma.cartSaveAttempt.findUnique({
      where: { id: attemptId },
      include: {
        _count: { select: { interventions: true } },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Save attempt not found');
    }

    return {
      status: attempt.status as CartSaveStatus,
      currentStage:
        attempt.status === 'ACTIVE'
          ? (attempt.currentStage as CartSaveStage)
          : null,
      interventionCount: attempt._count.interventions,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
    };
  }

  /**
   * Get or create cart save config for company
   */
  async getFlowConfig(companyId: string): Promise<CartSaveFlowConfig> {
    const config = await this.prisma.cartSaveConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      return DEFAULT_CART_SAVE_CONFIG;
    }

    return {
      ...DEFAULT_CART_SAVE_CONFIG,
      ...(config.stageConfigs as Partial<CartSaveFlowConfig>),
      maxAttemptsPerCart: config.maxAttemptsPerCart,
      respectUnsubscribe: config.respectUnsubscribe,
      blackoutHours: {
        start: config.blackoutHoursStart,
        end: config.blackoutHoursEnd,
      },
    };
  }

  /**
   * Update cart save config for company
   */
  async updateFlowConfig(
    companyId: string,
    updates: Partial<CartSaveFlowConfig>,
  ): Promise<CartSaveFlowConfig> {
    const existing = await this.getFlowConfig(companyId);
    const merged = { ...existing, ...updates };

    await this.prisma.cartSaveConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        stageConfigs: merged as unknown as object,
        maxAttemptsPerCart: merged.maxAttemptsPerCart,
        respectUnsubscribe: merged.respectUnsubscribe,
        blackoutHoursStart: merged.blackoutHours.start,
        blackoutHoursEnd: merged.blackoutHours.end,
      },
      update: {
        stageConfigs: merged as unknown as object,
        maxAttemptsPerCart: merged.maxAttemptsPerCart,
        respectUnsubscribe: merged.respectUnsubscribe,
        blackoutHoursStart: merged.blackoutHours.start,
        blackoutHoursEnd: merged.blackoutHours.end,
      },
    });

    return merged;
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  /**
   * Get cart recovery analytics for a company
   */
  async getAnalytics(
    companyId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<{
    totalAbandoned: number;
    totalRecovered: number;
    recoveryRate: number;
    revenueRecovered: number;
    averageCartValue: number;
    byChannel: Record<string, { attempts: number; recovered: number; rate: number }>;
    byReason: { reason: string; count: number; recoveryRate: number }[];
    byStage: { stage: string; dropoff: number; conversion: number }[];
    timeline: { date: string; abandoned: number; recovered: number }[];
  }> {
    const dateFilter: any = {};
    if (options?.startDate) {
      dateFilter.createdAt = { gte: options.startDate };
    }
    if (options?.endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, lte: options.endDate };
    }

    // Get all attempts in date range
    const attempts = await this.prisma.cartSaveAttempt.findMany({
      where: {
        companyId,
        ...dateFilter,
      },
      include: {
        cart: {
          select: { grandTotal: true },
        },
      },
    });

    const totalAbandoned = attempts.length;
    const converted = attempts.filter(a => a.status === 'CONVERTED');
    const totalRecovered = converted.length;
    const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0;

    // Calculate revenue
    const revenueRecovered = converted.reduce(
      (sum, a) => sum + Number(a.cart?.grandTotal || 0),
      0,
    );
    const averageCartValue = totalRecovered > 0 ? revenueRecovered / totalRecovered : 0;

    // Group by channel (extract from metadata)
    const byChannel: Record<string, { attempts: number; recovered: number; rate: number }> = {};
    for (const attempt of attempts) {
      const metadata = attempt.metadata as Record<string, unknown> | null;
      const channelsUsed = (metadata?.channelsUsed as string[]) || ['EMAIL'];
      for (const channel of channelsUsed) {
        if (!byChannel[channel]) {
          byChannel[channel] = { attempts: 0, recovered: 0, rate: 0 };
        }
        byChannel[channel].attempts++;
        if (attempt.status === 'CONVERTED') {
          byChannel[channel].recovered++;
        }
      }
    }
    for (const channel of Object.keys(byChannel)) {
      const data = byChannel[channel];
      data.rate = data.attempts > 0 ? (data.recovered / data.attempts) * 100 : 0;
    }

    // Group by reason
    const reasonCounts: Record<string, { count: number; converted: number }> = {};
    for (const attempt of attempts) {
      const reason = attempt.diagnosisReason || 'UNKNOWN';
      if (!reasonCounts[reason]) {
        reasonCounts[reason] = { count: 0, converted: 0 };
      }
      reasonCounts[reason].count++;
      if (attempt.status === 'CONVERTED') {
        reasonCounts[reason].converted++;
      }
    }
    const byReason = Object.entries(reasonCounts).map(([reason, data]) => ({
      reason,
      count: data.count,
      recoveryRate: data.count > 0 ? (data.converted / data.count) * 100 : 0,
    }));

    // Stage funnel analysis
    const stageFlow = [
      CartSaveStage.BROWSE_REMINDER,
      CartSaveStage.PATTERN_INTERRUPT,
      CartSaveStage.DIAGNOSIS_SURVEY,
      CartSaveStage.BRANCHING_INTERVENTION,
      CartSaveStage.NUCLEAR_OFFER,
      CartSaveStage.LOSS_VISUALIZATION,
    ];
    const byStage = stageFlow.map(stage => {
      const atStage = attempts.filter(a =>
        (a.stageHistory as any[])?.some((h: any) => h.stage === stage),
      );
      const convertedAtStage = atStage.filter(a => a.status === 'CONVERTED');
      const droppedAtStage = atStage.filter(a =>
        a.status !== 'CONVERTED' && a.currentStage === stage,
      );
      return {
        stage,
        dropoff: atStage.length > 0 ? (droppedAtStage.length / atStage.length) * 100 : 0,
        conversion: atStage.length > 0 ? (convertedAtStage.length / atStage.length) * 100 : 0,
      };
    });

    // Timeline (last 7 days)
    const timeline: { date: string; abandoned: number; recovered: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayAttempts = attempts.filter(
        a => new Date(a.createdAt).toISOString().split('T')[0] === dateStr,
      );
      timeline.push({
        date: dateStr,
        abandoned: dayAttempts.length,
        recovered: dayAttempts.filter(a => a.status === 'CONVERTED').length,
      });
    }

    return {
      totalAbandoned,
      totalRecovered,
      recoveryRate,
      revenueRecovered,
      averageCartValue,
      byChannel,
      byReason,
      byStage,
      timeline,
    };
  }

  /**
   * Get recent cart save attempts
   */
  async getAttempts(
    companyId: string,
    options?: {
      status?: CartSaveStatus;
      channel?: CartSaveChannel;
      limit?: number;
    },
  ): Promise<any[]> {
    const where: any = { companyId };
    if (options?.status) where.status = options.status;
    if (options?.channel) where.channel = options.channel;

    return this.prisma.cartSaveAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      include: {
        cart: {
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async getCartWithDetails(cartId: string): Promise<CartWithDetails | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        items: {
          select: {
            id: true,
            productSnapshot: true,
            unitPrice: true,
            quantity: true,
          },
        },
      },
    });

    if (!cart) return null;

    return {
      id: cart.id,
      companyId: cart.companyId,
      customerId: cart.customerId,
      grandTotal: Number(cart.grandTotal),
      itemCount: cart.itemCount,
      status: cart.status,
      customer: cart.customer,
      items: cart.items.map((item) => ({
        id: item.id,
        productSnapshot: item.productSnapshot as Record<string, unknown>,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
      })),
    };
  }

  private determineStartStage(
    cart: CartWithDetails,
    config: CartSaveFlowConfig,
  ): CartSaveStage {
    // Start with browse reminder for in-app notification
    if (config.stages.browseReminder.enabled) {
      return CartSaveStage.BROWSE_REMINDER;
    }

    // Skip to pattern interrupt if browse reminder disabled
    if (config.stages.patternInterrupt.enabled) {
      return CartSaveStage.PATTERN_INTERRUPT;
    }

    // Default to diagnosis
    return CartSaveStage.DIAGNOSIS_SURVEY;
  }

  private getNextStage(
    currentStage: CartSaveStage,
    config: CartSaveFlowConfig,
    response?: { type: CartSaveResponseType; data?: Record<string, unknown> },
  ): CartSaveStage | null {
    const stageOrder: CartSaveStage[] = [
      CartSaveStage.BROWSE_REMINDER,
      CartSaveStage.PATTERN_INTERRUPT,
      CartSaveStage.DIAGNOSIS_SURVEY,
      CartSaveStage.BRANCHING_INTERVENTION,
      CartSaveStage.NUCLEAR_OFFER,
      CartSaveStage.LOSS_VISUALIZATION,
      CartSaveStage.WINBACK_SEQUENCE,
    ];

    const currentIndex = stageOrder.indexOf(currentStage);

    // If converted or responded positively, no next stage needed
    if (response?.type === CartSaveResponseType.CONVERTED) {
      return null;
    }

    // Find next enabled stage
    for (let i = currentIndex + 1; i < stageOrder.length; i++) {
      const nextStage = stageOrder[i];
      const stageConfig = this.getStageConfig(nextStage, config);

      if (stageConfig?.enabled) {
        return nextStage;
      }
    }

    return null; // Exhausted all stages
  }

  private getStageConfig(
    stage: CartSaveStage,
    config: CartSaveFlowConfig,
  ): CartSaveFlowConfig['stages'][keyof CartSaveFlowConfig['stages']] | null {
    const stageMap: Partial<Record<
      CartSaveStage,
      keyof CartSaveFlowConfig['stages']
    >> = {
      [CartSaveStage.BROWSE_REMINDER]: 'browseReminder',
      [CartSaveStage.PATTERN_INTERRUPT]: 'patternInterrupt',
      [CartSaveStage.DIAGNOSIS_SURVEY]: 'diagnosisSurvey',
      [CartSaveStage.BRANCHING_INTERVENTION]: 'branchingIntervention',
      [CartSaveStage.NUCLEAR_OFFER]: 'nuclearOffer',
      [CartSaveStage.LOSS_VISUALIZATION]: 'lossVisualization',
      [CartSaveStage.WINBACK_SEQUENCE]: 'winbackSequence',
      // VOICE_RECOVERY uses nuclearOffer config as it's typically part of that stage
    };

    const key = stageMap[stage];
    return key ? config.stages[key] : null;
  }

  private selectChannels(
    stageConfig: CartSaveFlowConfig['stages'][keyof CartSaveFlowConfig['stages']],
  ): CartSaveChannel[] {
    if ('channels' in stageConfig && stageConfig.channels) {
      return stageConfig.channels;
    }
    if ('channel' in stageConfig && stageConfig.channel) {
      return [stageConfig.channel];
    }
    return [CartSaveChannel.EMAIL];
  }

  private async generateInterventionContent(
    attempt: { cart: CartWithDetails; diagnosisReason: string | null; currentStage: string },
    stageConfig: CartSaveFlowConfig['stages'][keyof CartSaveFlowConfig['stages']],
  ): Promise<InterventionContent> {
    const { cart, diagnosisReason } = attempt;
    const customerName = cart.customer?.firstName || 'there';

    // Generate stage-specific content
    const content = this.getStageContent(
      attempt.currentStage as CartSaveStage,
      customerName,
      cart,
      diagnosisReason as CartAbandonmentReason | null,
    );

    return {
      ...content,
      recoveryUrl: `${process.env.PORTAL_URL || ''}/recover/${cart.id}`,
      triggersApplied: ['urgency', 'loss_aversion'],
    };
  }

  private getStageContent(
    stage: CartSaveStage,
    customerName: string,
    cart: CartWithDetails,
    reason: CartAbandonmentReason | null,
  ): Omit<InterventionContent, 'recoveryUrl' | 'triggersApplied'> {
    const itemCount = cart.itemCount;
    const itemText = itemCount === 1 ? 'item' : 'items';

    switch (stage) {
      case CartSaveStage.BROWSE_REMINDER:
        return {
          subject: 'Still shopping?',
          headline: `Hey ${customerName}, still deciding?`,
          body: `You have ${itemCount} ${itemText} waiting in your cart.`,
          cta: 'Continue Shopping',
        };

      case CartSaveStage.PATTERN_INTERRUPT:
        return {
          subject: `${customerName}, you left something behind`,
          headline: 'Your cart misses you',
          body: `Your ${itemCount} ${itemText} are still waiting. Complete your order before they sell out!`,
          cta: 'Complete Your Order',
        };

      case CartSaveStage.DIAGNOSIS_SURVEY:
        return {
          subject: 'Quick question about your order',
          headline: `${customerName}, we noticed you didn't complete your order`,
          body: "We'd love to help. What's holding you back?",
          cta: 'Tell Us Why',
        };

      case CartSaveStage.BRANCHING_INTERVENTION:
        const intervention = this.getInterventionForReason(reason);
        return {
          subject: intervention?.message || 'A special offer for you',
          headline: "We've got something for you",
          body:
            intervention?.message ||
            'Complete your order today with a special offer.',
          cta: 'Claim Your Offer',
        };

      case CartSaveStage.NUCLEAR_OFFER:
        return {
          subject: 'Our best offer - just for you',
          headline: `${customerName}, this is our best offer`,
          body: "We really want you to experience our products. Here's our best deal.",
          cta: 'Get My Discount',
        };

      case CartSaveStage.LOSS_VISUALIZATION:
        return {
          subject: "Last chance - your cart is expiring",
          headline: "Don't miss out",
          body: `Your ${itemCount} ${itemText} won't be reserved much longer. Act now to avoid disappointment.`,
          cta: 'Save My Items',
        };

      case CartSaveStage.WINBACK_SEQUENCE:
        return {
          subject: 'We miss you!',
          headline: 'It\'s been a while',
          body: 'Your favorites are still here. Come back and see what\'s new!',
          cta: 'Shop Now',
        };

      default:
        return {
          subject: 'Complete your order',
          headline: 'Your cart is waiting',
          body: `You have ${itemCount} ${itemText} in your cart.`,
          cta: 'Complete Order',
        };
    }
  }

  private getInterventionForReason(
    reason: CartAbandonmentReason | null,
  ): { type: CartInterventionType; message: string; value?: number } | null {
    if (!reason) return null;

    const branch = DIAGNOSIS_BRANCHES.find((b) => b.reason === reason);
    return branch?.interventions[0] || null;
  }

  private generateOffer(
    stage: CartSaveStage,
    stageConfig: CartSaveFlowConfig['stages'][keyof CartSaveFlowConfig['stages']],
    reason: CartAbandonmentReason | null,
  ): CartOffer | null {
    // Only generate offers for intervention stages
    if (
      stage !== CartSaveStage.BRANCHING_INTERVENTION &&
      stage !== CartSaveStage.NUCLEAR_OFFER
    ) {
      return null;
    }

    const maxDiscount =
      'maxDiscountPercent' in stageConfig
        ? stageConfig.maxDiscountPercent
        : 10;

    // Generate discount based on reason
    if (reason === CartAbandonmentReason.TOO_EXPENSIVE) {
      return {
        type: 'PERCENTAGE',
        value: Math.min(maxDiscount || 10, 15),
        code: `SAVE${Math.min(maxDiscount || 10, 15)}`,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        description: `${Math.min(maxDiscount || 10, 15)}% off your order`,
      };
    }

    if (reason === CartAbandonmentReason.SHIPPING_COST) {
      return {
        type: 'FREE_SHIPPING',
        code: 'FREESHIP',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        description: 'Free shipping on your order',
      };
    }

    // Default offer for nuclear stage
    if (stage === CartSaveStage.NUCLEAR_OFFER) {
      return {
        type: 'PERCENTAGE',
        value: maxDiscount || 20,
        code: `COMEBACK${maxDiscount || 20}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        description: `${maxDiscount || 20}% off - our best offer`,
      };
    }

    return null;
  }

  private async completeSaveFlow(
    attemptId: string,
    status: CartSaveStatus,
  ): Promise<void> {
    await this.prisma.cartSaveAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Completed save attempt ${attemptId} with status ${status}`);
  }

  private calculateRiskScore(cart: CartWithDetails): number {
    // Simplified risk score calculation
    // In production, this would use ML model or more sophisticated scoring
    let score = 50; // Base score

    // Higher cart value = higher risk of abandonment
    if (Number(cart.grandTotal) > 100) score += 10;
    if (Number(cart.grandTotal) > 200) score += 10;

    // More items = more invested
    if (cart.itemCount > 3) score -= 10;

    // Existing customer = lower risk
    if (cart.customer) {
      score -= 15;
      // Long-term customer = even lower risk
      const customerAge = Date.now() - cart.customer.createdAt.getTime();
      if (customerAge > 30 * 24 * 60 * 60 * 1000) score -= 10; // 30 days
    }

    return Math.max(0, Math.min(100, score));
  }

  private hasHighValueItems(cart: CartWithDetails): boolean {
    return cart.items.some((item) => Number(item.unitPrice) > 50);
  }
}
