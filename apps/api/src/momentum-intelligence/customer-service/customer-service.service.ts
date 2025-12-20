import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AnthropicService } from '../../integrations/services/providers/anthropic.service';
import {
  CSTier,
  EscalationReason,
  CSSessionStatus,
  ResolutionType,
  IssueCategory,
  CustomerSentiment,
  CSSession,
  CSMessage,
  CustomerServiceContext,
  EscalationEvent,
  StartCSSessionDto,
  SendMessageDto,
  EscalateSessionDto,
  ResolveSessionDto,
  GetSessionsDto,
  CSAnalyticsDto,
  CSAnalytics,
  SentimentSnapshot,
} from '../types/customer-service.types';
import {
  buildSystemPrompt,
  buildConversationMessages,
  buildUserMessage,
  PromptContext,
} from './prompts';
import { Prisma, CSTier as PrismaCSTier, CSSessionStatus as PrismaCSSessionStatus } from '@prisma/client';

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly anthropicService: AnthropicService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async startSession(dto: StartCSSessionDto): Promise<CSSession> {
    this.logger.log(`Starting CS session for customer ${dto.customerId}`);

    // Build customer context from database
    const context = await this.buildCustomerContext(dto.companyId, dto.customerId);

    // Determine starting tier based on channel and company config
    const startingTier = await this.determineStartingTier(dto.companyId, dto.channel);

    // Initial sentiment history
    const sentimentHistory: SentimentSnapshot[] = [{
      sentiment: CustomerSentiment.NEUTRAL,
      score: 0.5,
      timestamp: new Date(),
    }];

    // Create the session in database
    const dbSession = await this.prisma.cSSession.create({
      data: {
        companyId: dto.companyId,
        customerId: dto.customerId,
        channel: dto.channel,
        currentTier: startingTier as PrismaCSTier,
        status: PrismaCSSessionStatus.ACTIVE,
        issueCategory: dto.issueCategory,
        customerSentiment: CustomerSentiment.NEUTRAL,
        sentimentHistory: sentimentHistory as unknown as Prisma.InputJsonValue,
        escalationHistory: [],
        context: context as unknown as Prisma.InputJsonValue,
      },
      include: {
        messages: true,
      },
    });

    // Track initial message if provided
    let analyzedMessage: { sentiment: CustomerSentiment; category?: IssueCategory; trigger?: string; keywords: string[] } | null = null;
    if (dto.initialMessage) {
      analyzedMessage = await this.analyzeMessage(dto.initialMessage);

      // Create customer message in database
      await this.prisma.cSMessage.create({
        data: {
          sessionId: dbSession.id,
          role: 'customer',
          content: dto.initialMessage,
          sentiment: analyzedMessage.sentiment,
        },
      });

      // Update session with analyzed data
      sentimentHistory.push({
        sentiment: analyzedMessage.sentiment,
        score: this.getSentimentScore(analyzedMessage.sentiment),
        timestamp: new Date(),
        trigger: analyzedMessage.trigger,
      });

      await this.prisma.cSSession.update({
        where: { id: dbSession.id },
        data: {
          customerSentiment: analyzedMessage.sentiment,
          issueCategory: analyzedMessage.category || dto.issueCategory,
          sentimentHistory: sentimentHistory as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Generate and save AI welcome response
    const welcomeContent = this.generateWelcomeMessage(startingTier as CSTier, context.customer.name);
    const role = startingTier === CSTier.AI_REP ? 'ai_rep' : startingTier === CSTier.AI_MANAGER ? 'ai_manager' : 'human_agent';

    await this.prisma.cSMessage.create({
      data: {
        sessionId: dbSession.id,
        role,
        content: welcomeContent,
        metadata: {
          suggestedActions: [],
        },
      },
    });

    // Log AI usage for billing
    await this.logAIUsage(dbSession.id, dto.companyId, startingTier as CSTier, dto.channel, {
      messageCount: dto.initialMessage ? 2 : 1,
      aiMessageCount: 1,
    });

    // Emit session started event
    this.eventEmitter.emit('cs.session.started', {
      sessionId: dbSession.id,
      companyId: dto.companyId,
      customerId: dto.customerId,
      tier: startingTier,
      channel: dto.channel,
    });

    this.logger.log(`CS session ${dbSession.id} started with tier ${startingTier}`);

    // Return full session with messages
    return this.getSessionById(dbSession.id);
  }

  async sendMessage(dto: SendMessageDto): Promise<{ session: CSSession; response: CSMessage }> {
    const session = await this.getSession(dto.sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (session.status !== CSSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is not active`);
    }

    // Analyze the customer's message
    const analyzedMessage = await this.analyzeMessage(dto.message);

    // Add customer message to database
    await this.prisma.cSMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: 'customer',
        content: dto.message,
        sentiment: analyzedMessage.sentiment,
      },
    });

    // Update sentiment tracking
    const sentimentHistory = session.sentimentHistory || [];
    sentimentHistory.push({
      sentiment: analyzedMessage.sentiment,
      score: this.getSentimentScore(analyzedMessage.sentiment),
      timestamp: new Date(),
      trigger: analyzedMessage.trigger,
    });

    await this.prisma.cSSession.update({
      where: { id: dto.sessionId },
      data: {
        customerSentiment: analyzedMessage.sentiment,
        sentimentHistory: sentimentHistory as unknown as Prisma.InputJsonValue,
      },
    });

    // Check for escalation triggers
    const escalationCheck = await this.checkEscalationTriggers(session, analyzedMessage);
    if (escalationCheck.shouldEscalate) {
      await this.escalateSession({
        sessionId: session.id,
        reason: escalationCheck.reason!,
        targetTier: escalationCheck.targetTier!,
        notes: escalationCheck.notes,
      });
    }

    // Generate AI response based on current tier
    const updatedSession = await this.getSessionById(dto.sessionId);
    const aiResponse = await this.generateAIResponse(updatedSession, updatedSession.currentTier);

    // Save AI response to database
    const savedResponse = await this.prisma.cSMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: aiResponse.role,
        content: aiResponse.content,
        metadata: aiResponse.metadata as unknown as Prisma.InputJsonValue,
      },
    });

    // Log AI usage for billing
    await this.logAIUsage(dto.sessionId, session.companyId, session.currentTier, session.channel, {
      messageCount: 2,
      aiMessageCount: 1,
    });

    // Emit message event
    this.eventEmitter.emit('cs.message.received', {
      sessionId: session.id,
      sentiment: analyzedMessage.sentiment,
      requiresEscalation: escalationCheck.shouldEscalate,
    });

    const finalSession = await this.getSessionById(dto.sessionId);

    return {
      session: finalSession,
      response: {
        id: savedResponse.id,
        role: savedResponse.role as CSMessage['role'],
        content: savedResponse.content,
        timestamp: savedResponse.createdAt,
        metadata: savedResponse.metadata as CSMessage['metadata'],
      }
    };
  }

  async escalateSession(dto: EscalateSessionDto): Promise<CSSession> {
    const session = await this.getSession(dto.sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const previousTier = session.currentTier;

    // Record escalation
    const escalationEvent: EscalationEvent = {
      fromTier: previousTier,
      toTier: dto.targetTier,
      reason: dto.reason,
      timestamp: new Date(),
      notes: dto.notes,
    };

    const escalationHistory = session.escalationHistory || [];
    escalationHistory.push(escalationEvent);

    // Update session in database
    const newStatus = dto.targetTier === CSTier.HUMAN_AGENT
      ? PrismaCSSessionStatus.ESCALATED
      : session.status as unknown as PrismaCSSessionStatus;

    await this.prisma.cSSession.update({
      where: { id: dto.sessionId },
      data: {
        currentTier: dto.targetTier as PrismaCSTier,
        status: newStatus,
        escalationHistory: escalationHistory as unknown as Prisma.InputJsonValue,
      },
    });

    // Add system message about escalation
    await this.prisma.cSMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: 'system',
        content: this.getEscalationMessage(previousTier, dto.targetTier, dto.reason),
      },
    });

    // Generate response from new tier
    const updatedSession = await this.getSessionById(dto.sessionId);
    const aiResponse = await this.generateAIResponse(updatedSession, dto.targetTier);

    await this.prisma.cSMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: aiResponse.role,
        content: aiResponse.content,
        metadata: aiResponse.metadata as unknown as Prisma.InputJsonValue,
      },
    });

    // Emit escalation event
    this.eventEmitter.emit('cs.session.escalated', {
      sessionId: session.id,
      fromTier: previousTier,
      toTier: dto.targetTier,
      reason: dto.reason,
    });

    this.logger.log(`Session ${session.id} escalated from ${previousTier} to ${dto.targetTier}`);
    return this.getSessionById(dto.sessionId);
  }

  async resolveSession(dto: ResolveSessionDto): Promise<CSSession> {
    const session = await this.getSession(dto.sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const resolvedAt = new Date();

    // Update session in database
    await this.prisma.cSSession.update({
      where: { id: dto.sessionId },
      data: {
        status: PrismaCSSessionStatus.RESOLVED,
        resolutionType: dto.resolutionType,
        resolutionSummary: dto.summary,
        resolutionActions: dto.actionsTaken as Prisma.InputJsonValue,
        followUpRequired: dto.followUpRequired || false,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        resolvedAt,
      },
    });

    // Add resolution message
    await this.prisma.cSMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: 'system',
        content: `Session resolved: ${dto.resolutionType}. ${dto.summary}`,
      },
    });

    // Emit resolution event
    this.eventEmitter.emit('cs.session.resolved', {
      sessionId: session.id,
      resolutionType: dto.resolutionType,
      tier: session.currentTier,
      duration: resolvedAt.getTime() - new Date(session.createdAt).getTime(),
    });

    return this.getSessionById(dto.sessionId);
  }

  async getSessions(dto: GetSessionsDto): Promise<{ items: CSSession[]; total: number }> {
    const where: Prisma.CSSessionWhereInput = {
      companyId: dto.companyId,
    };

    if (dto.status) {
      where.status = dto.status as PrismaCSSessionStatus;
    }
    if (dto.tier) {
      where.currentTier = dto.tier as PrismaCSTier;
    }
    if (dto.customerId) {
      where.customerId = dto.customerId;
    }
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    const [sessions, total] = await Promise.all([
      this.prisma.cSSession.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: dto.limit || 50,
        skip: dto.offset || 0,
      }),
      this.prisma.cSSession.count({ where }),
    ]);

    // Transform to CSSession type with customer data
    const items = await Promise.all(
      sessions.map(async (session) => this.transformDbSession(session))
    );

    return { items, total };
  }

  async getSessionById(sessionId: string): Promise<CSSession> {
    const session = await this.prisma.cSSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return this.transformDbSession(session);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT & ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  private async buildCustomerContext(
    companyId: string,
    customerId: string,
  ): Promise<CustomerServiceContext> {
    // Fetch customer from database
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Get previous CS sessions for escalation count
    const previousSessions = await this.prisma.cSSession.count({
      where: {
        customerId,
        companyId,
        status: PrismaCSSessionStatus.ESCALATED,
      },
    });

    // Calculate lifetime value from transactions
    const lifetimeValueResult = await this.prisma.transaction.aggregate({
      where: {
        customerId,
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    const lifetimeValue = lifetimeValueResult._sum.amount?.toNumber() || 0;
    const isVIP = lifetimeValue > 10000; // VIP threshold

    // Calculate tenure in months
    const createdAt = customer?.createdAt || new Date();
    const tenureMonths = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Build customer context
    const customerContext = {
      id: customerId,
      name: customer
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email.split('@')[0]
        : 'Customer',
      email: customer?.email || 'unknown@example.com',
      phone: customer?.phone || undefined,
      tier: isVIP ? 'VIP' : lifetimeValue > 5000 ? 'Gold' : lifetimeValue > 1000 ? 'Silver' : 'Standard',
      lifetimeValue,
      tenureMonths,
      rewardsBalance: 0, // Would need rewards system integration
      isVIP,
      previousEscalations: previousSessions,
    };

    // Transform orders to order history
    const orderHistory = (customer?.orders || []).map((order) => ({
      id: order.id,
      date: order.createdAt,
      total: order.total?.toNumber() || 0,
      status: order.status,
      items: 0, // Would need to count items
      trackingNumber: undefined,
      deliveryStatus: order.fulfillmentStatus || undefined,
    }));

    // Get recent CS interaction history
    const recentSessions = await this.prisma.cSSession.findMany({
      where: {
        customerId,
        companyId,
        resolvedAt: { not: null },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
    });

    const recentHistory = recentSessions.map((s) => ({
      id: s.id,
      date: s.resolvedAt || s.createdAt,
      channel: s.channel,
      issueCategory: (s.issueCategory as IssueCategory) || IssueCategory.GENERAL_INQUIRY,
      resolution: (s.resolutionType as ResolutionType) || ResolutionType.UNRESOLVED,
      satisfaction: s.customerSatisfaction || undefined,
      handledBy: s.currentTier as CSTier,
    }));

    // Build subscription summary if exists
    const activeSubscription = customer?.subscriptions?.[0];
    const subscriptionSummary = activeSubscription
      ? {
          id: activeSubscription.id,
          plan: activeSubscription.planName || 'Standard',
          status: activeSubscription.status.toLowerCase() as 'active' | 'paused' | 'cancelled',
          nextBillingDate: activeSubscription.currentPeriodEnd || undefined,
          monthlyAmount: activeSubscription.planAmount?.toNumber() || 0,
          startDate: activeSubscription.createdAt,
        }
      : undefined;

    return {
      customer: customerContext,
      recentHistory,
      orderHistory,
      activeSubscription: subscriptionSummary,
      openTickets: [], // Would need ticket system integration
      availableActions: this.getAvailableActions(CSTier.AI_REP),
    };
  }

  private async analyzeMessage(message: string): Promise<{
    sentiment: CustomerSentiment;
    category?: IssueCategory;
    trigger?: string;
    keywords: string[];
  }> {
    const lowerMessage = message.toLowerCase();

    // Sentiment detection
    let sentiment = CustomerSentiment.NEUTRAL;
    let trigger: string | undefined;

    const irateKeywords = ['angry', 'furious', 'ridiculous', 'unacceptable', 'lawsuit', 'lawyer', 'bbb', 'attorney'];
    const angryKeywords = ['upset', 'frustrated', 'annoyed', 'terrible', 'horrible', 'worst'];
    const frustratedKeywords = ['disappointed', 'unhappy', 'not happy', 'problem', 'issue'];
    const positiveKeywords = ['thank', 'great', 'appreciate', 'helpful', 'excellent'];

    if (irateKeywords.some(kw => lowerMessage.includes(kw))) {
      sentiment = CustomerSentiment.IRATE;
      trigger = irateKeywords.find(kw => lowerMessage.includes(kw));
    } else if (angryKeywords.some(kw => lowerMessage.includes(kw))) {
      sentiment = CustomerSentiment.ANGRY;
      trigger = angryKeywords.find(kw => lowerMessage.includes(kw));
    } else if (frustratedKeywords.some(kw => lowerMessage.includes(kw))) {
      sentiment = CustomerSentiment.FRUSTRATED;
      trigger = frustratedKeywords.find(kw => lowerMessage.includes(kw));
    } else if (positiveKeywords.some(kw => lowerMessage.includes(kw))) {
      sentiment = CustomerSentiment.SATISFIED;
    }

    // Category detection
    let category: IssueCategory | undefined;
    if (lowerMessage.includes('refund') || lowerMessage.includes('money back')) {
      category = IssueCategory.REFUND;
    } else if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || lowerMessage.includes('track')) {
      category = IssueCategory.SHIPPING;
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('subscription')) {
      category = IssueCategory.CANCELLATION;
    } else if (lowerMessage.includes('charge') || lowerMessage.includes('bill') || lowerMessage.includes('payment')) {
      category = IssueCategory.BILLING;
    } else if (lowerMessage.includes('quality') || lowerMessage.includes('broken') || lowerMessage.includes('defect')) {
      category = IssueCategory.PRODUCT_QUALITY;
    }

    return {
      sentiment,
      category,
      trigger,
      keywords: this.extractKeywords(message),
    };
  }

  private async checkEscalationTriggers(
    session: CSSession,
    analysis: { sentiment: CustomerSentiment; trigger?: string; keywords: string[] },
  ): Promise<{
    shouldEscalate: boolean;
    reason?: EscalationReason;
    targetTier?: CSTier;
    notes?: string;
  }> {
    // Check for irate customer - immediate escalation to manager
    if (analysis.sentiment === CustomerSentiment.IRATE) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.IRATE_CUSTOMER,
        targetTier: session.currentTier === CSTier.AI_REP ? CSTier.AI_MANAGER : CSTier.HUMAN_AGENT,
        notes: `Irate customer detected. Trigger: ${analysis.trigger}`,
      };
    }

    // Check for legal mentions
    const legalKeywords = ['lawyer', 'attorney', 'lawsuit', 'sue', 'legal action', 'court'];
    if (analysis.keywords.some(kw => legalKeywords.includes(kw.toLowerCase()))) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.LEGAL_MENTION,
        targetTier: CSTier.HUMAN_AGENT,
        notes: 'Customer mentioned legal action',
      };
    }

    // Check for social media threats
    const socialKeywords = ['twitter', 'facebook', 'review', 'yelp', 'post online', 'tell everyone'];
    if (analysis.keywords.some(kw => socialKeywords.includes(kw.toLowerCase()))) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.SOCIAL_MEDIA_THREAT,
        targetTier: CSTier.AI_MANAGER,
        notes: 'Customer threatened social media action',
      };
    }

    // Check for refund requests (AI Rep → AI Manager)
    if (
      session.issueCategory === IssueCategory.REFUND &&
      session.currentTier === CSTier.AI_REP
    ) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.REFUND_REQUEST,
        targetTier: CSTier.AI_MANAGER,
        notes: 'Refund request requires manager approval',
      };
    }

    // Check for VIP customers
    if (session.context.customer.isVIP && session.currentTier === CSTier.AI_REP) {
      return {
        shouldEscalate: true,
        reason: EscalationReason.HIGH_VALUE_CUSTOMER,
        targetTier: CSTier.AI_MANAGER,
        notes: 'VIP customer auto-escalated',
      };
    }

    return { shouldEscalate: false };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI RESPONSE GENERATION (Claude Integration)
  // ═══════════════════════════════════════════════════════════════════════════

  private async generateAIResponse(session: CSSession, tier: CSTier): Promise<CSMessage> {
    const role = tier === CSTier.AI_REP ? 'ai_rep' : tier === CSTier.AI_MANAGER ? 'ai_manager' : 'human_agent';

    // Check if Anthropic is configured for this company and tier is not human
    if (tier !== CSTier.HUMAN_AGENT) {
      const isAnthropicConfigured = await this.anthropicService.isConfigured(session.companyId);
      if (isAnthropicConfigured) {
        try {
          return await this.generateClaudeResponse(session, tier);
        } catch (error) {
          this.logger.error('Claude API error, falling back to template:', error);
          // Fall through to template-based response
        }
      } else {
        this.logger.debug(`Anthropic not configured for company ${session.companyId} - using template responses`);
      }
    }

    // Fallback to template-based responses
    return this.generateTemplateResponse(session, tier, role);
  }

  /**
   * Generate AI response using Anthropic Claude via AnthropicService
   */
  private async generateClaudeResponse(session: CSSession, tier: CSTier): Promise<CSMessage> {
    const role = tier === CSTier.AI_REP ? 'ai_rep' : 'ai_manager';

    // Get company name for prompts
    const company = await this.prisma.company.findUnique({
      where: { id: session.companyId },
      select: { name: true },
    });

    // Get tier configuration from CSConfig
    const csConfig = await this.prisma.cSConfig.findUnique({
      where: { companyId: session.companyId },
    });

    const tierConfig = tier === CSTier.AI_REP
      ? (csConfig?.aiRepConfig as any) || {}
      : (csConfig?.aiManagerConfig as any) || {};

    // Build prompt context
    const promptContext: PromptContext = {
      companyName: company?.name || 'Our Company',
      customerName: session.context?.customer?.name || 'Customer',
      customerId: session.customerId,
      tier,
      sentiment: session.customerSentiment,
      issueCategory: session.issueCategory,
      conversationHistory: session.messages.map(m => ({
        role: m.role as 'customer' | 'ai_rep' | 'ai_manager' | 'system',
        content: m.content,
        timestamp: m.timestamp,
      })),
      customerContext: session.context?.customer ? {
        isVip: session.context.customer.isVIP || false,
        lifetimeValue: session.context.customer.lifetimeValue || 0,
        accountAge: `${session.context.customer.tenureMonths || 0} months`,
        recentOrders: session.context.orderHistory?.length || 0,
        activeSubscription: !!session.context.activeSubscription,
      } : undefined,
      tierConfig: {
        maxDiscountPercent: tierConfig.maxDiscountPercent || (tier === CSTier.AI_REP ? 15 : 30),
        maxRefundAmount: tierConfig.maxRefundAmount || (tier === CSTier.AI_REP ? 50 : 200),
        maxWaiveAmount: tierConfig.maxWaiveAmount || (tier === CSTier.AI_REP ? 25 : 100),
        maxGoodwillCredit: tierConfig.maxGoodwillCredit || (tier === CSTier.AI_REP ? 10 : 50),
      },
    };

    // Build prompts
    const systemPrompt = buildSystemPrompt(promptContext);
    const messages = buildConversationMessages(promptContext);

    // If this is the first message, add a generic user message to get AI to introduce itself
    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello, I need help.' });
    }

    // Get model settings from integration
    const defaultModel = await this.anthropicService.getDefaultModel(session.companyId);
    const maxTokens = await this.anthropicService.getMaxTokens(session.companyId);

    // Call Claude API via AnthropicService
    const startTime = Date.now();
    const response = await this.anthropicService.sendMessage(session.companyId, {
      model: defaultModel,
      maxTokens: Math.min(maxTokens, 500), // Cap at 500 for CS responses
      system: systemPrompt,
      messages: messages,
    });

    if (!response) {
      throw new Error('Failed to get response from Anthropic');
    }

    const latencyMs = Date.now() - startTime;

    // Track token usage for billing
    await this.trackClaudeUsage(session.id, session.companyId, tier, {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      latencyMs,
      model: response.model,
    });

    // Generate suggested actions based on context
    const suggestedActions = this.getSuggestedActionsForCategory(session.issueCategory);

    return {
      id: '', // Will be set by database
      role,
      content: response.content,
      timestamp: new Date(),
      metadata: {
        suggestedActions,
        aiGenerated: true,
        model: response.model,
        tokens: {
          input: response.usage.inputTokens,
          output: response.usage.outputTokens,
        },
        latencyMs,
      },
    };
  }

  /**
   * Track Claude API usage for billing
   */
  private async trackClaudeUsage(
    sessionId: string,
    companyId: string,
    tier: CSTier,
    usage: {
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      model: string;
    },
  ): Promise<void> {
    try {
      // Get company's organization for pricing lookup
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { client: { select: { organizationId: true, id: true } } },
      });

      // Get pricing (Claude Sonnet pricing as of 2025)
      // Input: $3 per million tokens, Output: $15 per million tokens
      const inputCostCents = (usage.inputTokens / 1_000_000) * 300;
      const outputCostCents = (usage.outputTokens / 1_000_000) * 1500;
      const baseCostCents = Math.ceil(inputCostCents + outputCostCents);

      // Apply company markup (from CSAIPricing if configured)
      let markupPercent = 20; // Default 20% markup
      if (company?.client?.organizationId) {
        const pricing = await this.prisma.cSAIPricing.findFirst({
          where: { organizationId: company.client.organizationId },
        });
        if (pricing) {
          markupPercent = tier === CSTier.AI_MANAGER
            ? pricing.aiManagerMultiplier * 100 - 100
            : pricing.aiRepMultiplier * 100 - 100;
        }
      }

      const markupCostCents = Math.ceil(baseCostCents * (markupPercent / 100));
      const totalCostCents = baseCostCents + markupCostCents;

      // Create usage record
      await this.prisma.cSAIUsage.create({
        data: {
          companyId,
          clientId: company?.client?.id || '',
          csSessionId: sessionId,
          usageType: 'CHAT_SESSION',
          tier,
          channel: 'chat',
          messageCount: 1,
          aiMessageCount: 1,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          billingPeriod: this.getCurrentBillingPeriod(),
          baseCost: baseCostCents,
          markupCost: markupCostCents,
          totalCost: totalCostCents,
          metadata: {
            model: usage.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            latencyMs: usage.latencyMs,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.debug(
        `Claude usage tracked: ${usage.inputTokens}+${usage.outputTokens} tokens, $${(totalCostCents / 100).toFixed(4)} total`,
      );
    } catch (error) {
      this.logger.error('Failed to track Claude usage:', error);
      // Don't throw - usage tracking failure shouldn't break the response
    }
  }

  /**
   * Generate template-based response (fallback when Claude is unavailable)
   */
  private generateTemplateResponse(session: CSSession, tier: CSTier, role: string): CSMessage {
    let content: string;
    let suggestedActions: string[] = [];
    let internalNotes: string | undefined;

    if (session.messages.length <= 1) {
      // Welcome message
      content = this.generateWelcomeMessage(tier, session.context?.customer?.name || 'Customer');
    } else if (session.customerSentiment === CustomerSentiment.IRATE) {
      // De-escalation response
      content = this.generateDeescalationResponse(tier);
      suggestedActions = ['Offer immediate callback', 'Provide compensation', 'Escalate to human'];
      internalNotes = 'Customer is irate - following de-escalation protocol';
    } else {
      // Regular response based on issue category
      content = this.generateCategoryResponse(tier, session.issueCategory);
      suggestedActions = this.getSuggestedActionsForCategory(session.issueCategory);
    }

    return {
      id: '', // Will be set by database
      role: role as CSMessage['role'],
      content,
      timestamp: new Date(),
      metadata: {
        suggestedActions,
        internalNotes,
        aiGenerated: false,
      },
    };
  }

  private generateWelcomeMessage(tier: CSTier, customerName: string): string {
    if (tier === CSTier.AI_REP) {
      return `Hello ${customerName}! I'm your AI Customer Support Representative. I'm here to help you today. How can I assist you?`;
    } else if (tier === CSTier.AI_MANAGER) {
      return `Hello ${customerName}, I'm the AI Customer Service Manager. I understand you need some additional assistance. I have elevated permissions to help resolve your issue. What can I do for you?`;
    }
    return `Hello ${customerName}, you're now connected with our customer service team. How can we help you today?`;
  }

  private generateDeescalationResponse(tier: CSTier): string {
    if (tier === CSTier.AI_MANAGER) {
      return `I sincerely apologize for the frustration you're experiencing. As a Customer Service Manager, I have the authority to make things right. Please let me review your situation and find a solution that works for you. Your satisfaction is my priority.`;
    }
    return `I completely understand your frustration, and I want you to know that your concerns are valid and important to us. Let me connect you with someone who has the authority to fully resolve this for you.`;
  }

  private generateCategoryResponse(tier: CSTier, category?: IssueCategory): string {
    const managerPrefix = tier === CSTier.AI_MANAGER ? 'As a manager, ' : '';

    switch (category) {
      case IssueCategory.REFUND:
        return `${managerPrefix}I'd be happy to help you with your refund request. Let me pull up your order details and review the refund options available to you.`;
      case IssueCategory.SHIPPING:
        return `I can help you track your order and resolve any shipping concerns. Let me check the current status of your delivery.`;
      case IssueCategory.CANCELLATION:
        return `I understand you're considering cancellation. Before we proceed, I'd love to understand what's led to this decision and see if there's anything we can do to address your concerns.`;
      case IssueCategory.BILLING:
        return `I can help you with your billing inquiry. Let me review your account and recent charges to ensure everything is correct.`;
      case IssueCategory.PRODUCT_QUALITY:
        return `I'm sorry to hear you're experiencing product issues. ${managerPrefix}I can help arrange a replacement or refund for you right away.`;
      default:
        return `I'm here to help! Could you please tell me more about what you need assistance with today?`;
    }
  }

  private getSuggestedActionsForCategory(category?: IssueCategory): string[] {
    switch (category) {
      case IssueCategory.REFUND:
        return ['Process full refund', 'Process partial refund', 'Offer store credit', 'Escalate to finance'];
      case IssueCategory.SHIPPING:
        return ['Track package', 'Expedite shipping', 'Send replacement', 'Issue shipping refund'];
      case IssueCategory.CANCELLATION:
        return ['Process cancellation', 'Offer discount to stay', 'Pause subscription', 'Downgrade plan'];
      case IssueCategory.BILLING:
        return ['Adjust charge', 'Apply credit', 'Explain charge', 'Update payment method'];
      default:
        return ['Gather more information', 'Check order history', 'Review account'];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(dto: CSAnalyticsDto): Promise<CSAnalytics> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const where: Prisma.CSSessionWhereInput = {
      companyId: dto.companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Get all sessions for the period
    const sessions = await this.prisma.cSSession.findMany({
      where,
      include: {
        messages: true,
      },
    });

    const totalSessions = sessions.length;
    const resolvedSessions = sessions.filter(s => s.status === 'RESOLVED').length;
    const resolutionRate = totalSessions > 0 ? Math.round((resolvedSessions / totalSessions) * 100) : 0;

    // Calculate average resolution time (in minutes)
    const resolvedWithTime = sessions.filter(s => s.resolvedAt);
    const avgResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, s) => {
          const duration = (s.resolvedAt!.getTime() - s.createdAt.getTime()) / 60000;
          return sum + duration;
        }, 0) / resolvedWithTime.length
      : 0;

    // Calculate average messages per session
    const avgMessagesPerSession = totalSessions > 0
      ? sessions.reduce((sum, s) => sum + s.messages.length, 0) / totalSessions
      : 0;

    // Calculate customer satisfaction average
    const satisfactionScores = sessions
      .filter(s => s.customerSatisfaction !== null)
      .map(s => s.customerSatisfaction!);
    const customerSatisfactionAvg = satisfactionScores.length > 0
      ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
      : 0;

    // Analytics by tier
    const byTier = await this.calculateTierAnalytics(sessions);

    // Analytics by channel
    const byChannel = await this.calculateChannelAnalytics(sessions);

    // Analytics by category
    const byCategory = await this.calculateCategoryAnalytics(sessions);

    // Escalation analytics
    const escalations = this.calculateEscalationAnalytics(sessions);

    // Sentiment analytics
    const sentiment = this.calculateSentimentAnalytics(sessions);

    // Top issues
    const topIssues = this.calculateTopIssues(sessions);

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalSessions,
        resolvedSessions,
        resolutionRate,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
        customerSatisfactionAvg: Math.round(customerSatisfactionAvg * 10) / 10,
      },
      byTier,
      byChannel,
      byCategory,
      escalations,
      sentiment,
      topIssues,
    };
  }

  private async calculateTierAnalytics(sessions: Array<{ currentTier: string; status: string; createdAt: Date; resolvedAt: Date | null }>): Promise<CSAnalytics['byTier']> {
    const tiers = [CSTier.AI_REP, CSTier.AI_MANAGER, CSTier.HUMAN_AGENT];

    return tiers.map(tier => {
      const tierSessions = sessions.filter(s => s.currentTier === tier);
      const resolved = tierSessions.filter(s => s.status === 'RESOLVED');
      const avgTime = resolved.length > 0
        ? resolved.reduce((sum, s) => {
            const duration = (s.resolvedAt!.getTime() - s.createdAt.getTime()) / 60000;
            return sum + duration;
          }, 0) / resolved.length
        : 0;

      return {
        tier,
        sessions: tierSessions.length,
        resolved: resolved.length,
        resolutionRate: tierSessions.length > 0
          ? Math.round((resolved.length / tierSessions.length) * 100)
          : 0,
        avgTime: Math.round(avgTime * 10) / 10,
      };
    });
  }

  private async calculateChannelAnalytics(sessions: Array<{ channel: string; status: string; createdAt: Date; resolvedAt: Date | null }>): Promise<CSAnalytics['byChannel']> {
    const channels = ['chat', 'voice', 'email', 'sms'];

    return channels.map(channel => {
      const channelSessions = sessions.filter(s => s.channel === channel);
      const resolved = channelSessions.filter(s => s.status === 'RESOLVED');
      const avgTime = resolved.length > 0
        ? resolved.reduce((sum, s) => {
            const duration = (s.resolvedAt!.getTime() - s.createdAt.getTime()) / 60000;
            return sum + duration;
          }, 0) / resolved.length
        : 0;

      return {
        channel,
        sessions: channelSessions.length,
        resolved: resolved.length,
        avgTime: Math.round(avgTime * 10) / 10,
      };
    }).filter(c => c.sessions > 0);
  }

  private async calculateCategoryAnalytics(sessions: Array<{ issueCategory: string | null; status: string; resolutionType: string | null; createdAt: Date; resolvedAt: Date | null }>): Promise<CSAnalytics['byCategory']> {
    const categories = Object.values(IssueCategory);

    return categories.map(category => {
      const categorySessions = sessions.filter(s => s.issueCategory === category);
      const resolved = categorySessions.filter(s => s.resolvedAt);
      const avgTime = resolved.length > 0
        ? resolved.reduce((sum, s) => {
            const duration = (s.resolvedAt!.getTime() - s.createdAt.getTime()) / 60000;
            return sum + duration;
          }, 0) / resolved.length
        : 0;

      // Get top resolutions
      const resolutionCounts: Record<string, number> = {};
      resolved.forEach(s => {
        if (s.resolutionType) {
          resolutionCounts[s.resolutionType] = (resolutionCounts[s.resolutionType] || 0) + 1;
        }
      });
      const topResolutions = Object.entries(resolutionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type as ResolutionType);

      return {
        category,
        count: categorySessions.length,
        avgResolutionTime: Math.round(avgTime * 10) / 10,
        topResolutions,
      };
    }).filter(c => c.count > 0);
  }

  private calculateEscalationAnalytics(sessions: Array<{ escalationHistory: unknown; createdAt: Date }>): CSAnalytics['escalations'] {
    const byReason: Record<EscalationReason, number> = {
      [EscalationReason.IRATE_CUSTOMER]: 0,
      [EscalationReason.REFUND_REQUEST]: 0,
      [EscalationReason.COMPLEX_ISSUE]: 0,
      [EscalationReason.REPEAT_CONTACT]: 0,
      [EscalationReason.HIGH_VALUE_CUSTOMER]: 0,
      [EscalationReason.LEGAL_MENTION]: 0,
      [EscalationReason.SOCIAL_MEDIA_THREAT]: 0,
      [EscalationReason.REFUND_OVER_THRESHOLD]: 0,
      [EscalationReason.CUSTOMER_REQUEST]: 0,
      [EscalationReason.POLICY_EXCEPTION]: 0,
      [EscalationReason.ESCALATED_COMPLAINT]: 0,
      [EscalationReason.TECHNICAL_LIMITATION]: 0,
    };

    let totalEscalations = 0;
    let escalationTimeSum = 0;

    sessions.forEach(session => {
      const history = (session.escalationHistory as EscalationEvent[]) || [];
      history.forEach(event => {
        if (event.reason && byReason[event.reason] !== undefined) {
          byReason[event.reason]++;
          totalEscalations++;

          // Calculate time to escalation
          const escalationTime = (new Date(event.timestamp).getTime() - session.createdAt.getTime()) / 60000;
          escalationTimeSum += escalationTime;
        }
      });
    });

    const avgEscalationTime = totalEscalations > 0 ? escalationTimeSum / totalEscalations : 0;
    const escalationRate = sessions.length > 0
      ? Math.round((totalEscalations / sessions.length) * 100)
      : 0;

    return {
      total: totalEscalations,
      byReason,
      avgEscalationTime: Math.round(avgEscalationTime * 10) / 10,
      escalationRate,
    };
  }

  private calculateSentimentAnalytics(sessions: Array<{ customerSentiment: string; sentimentHistory: unknown }>): CSAnalytics['sentiment'] {
    const distribution: Record<CustomerSentiment, number> = {
      [CustomerSentiment.HAPPY]: 0,
      [CustomerSentiment.SATISFIED]: 0,
      [CustomerSentiment.NEUTRAL]: 0,
      [CustomerSentiment.FRUSTRATED]: 0,
      [CustomerSentiment.ANGRY]: 0,
      [CustomerSentiment.IRATE]: 0,
    };

    let irateIncidents = 0;
    let sentimentImprovementCount = 0;
    let sentimentImprovementTotal = 0;

    sessions.forEach(session => {
      // Count final sentiment
      if (session.customerSentiment && distribution[session.customerSentiment as CustomerSentiment] !== undefined) {
        distribution[session.customerSentiment as CustomerSentiment]++;
      }

      // Check for irate incidents
      const history = (session.sentimentHistory as SentimentSnapshot[]) || [];
      if (history.some(h => h.sentiment === CustomerSentiment.IRATE)) {
        irateIncidents++;
      }

      // Calculate sentiment improvement (first vs last)
      if (history.length >= 2) {
        const firstScore = history[0].score;
        const lastScore = history[history.length - 1].score;
        if (lastScore > firstScore) {
          sentimentImprovementCount++;
        }
        sentimentImprovementTotal++;
      }
    });

    const sentimentImprovement = sentimentImprovementTotal > 0
      ? Math.round((sentimentImprovementCount / sentimentImprovementTotal) * 100)
      : 0;

    return {
      distribution,
      irateIncidents,
      sentimentImprovement,
    };
  }

  private calculateTopIssues(sessions: Array<{ issueCategory: string | null; createdAt: Date; resolvedAt: Date | null }>): CSAnalytics['topIssues'] {
    const issueCounts: Record<string, { count: number; totalTime: number; resolvedCount: number }> = {};

    sessions.forEach(session => {
      const issue = session.issueCategory || 'General inquiry';
      if (!issueCounts[issue]) {
        issueCounts[issue] = { count: 0, totalTime: 0, resolvedCount: 0 };
      }
      issueCounts[issue].count++;

      if (session.resolvedAt) {
        const duration = (session.resolvedAt.getTime() - session.createdAt.getTime()) / 60000;
        issueCounts[issue].totalTime += duration;
        issueCounts[issue].resolvedCount++;
      }
    });

    return Object.entries(issueCounts)
      .map(([issue, data]) => ({
        issue: issue.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        count: data.count,
        avgResolutionTime: data.resolvedCount > 0
          ? Math.round((data.totalTime / data.resolvedCount) * 10) / 10
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getSession(sessionId: string): Promise<CSSession | null> {
    const session = await this.prisma.cSSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return null;
    }

    return this.transformDbSession(session);
  }

  private async transformDbSession(
    session: Awaited<ReturnType<typeof this.prisma.cSSession.findUnique>> & { messages?: Array<{
      id: string;
      role: string;
      content: string;
      sentiment: string | null;
      metadata: unknown;
      createdAt: Date;
    }> }
  ): Promise<CSSession> {
    if (!session) {
      throw new Error('Session cannot be null');
    }

    // Get customer data
    const customer = await this.prisma.customer.findFirst({
      where: { id: session.customerId },
    });

    const context = (session.context as unknown as CustomerServiceContext) || await this.buildCustomerContext(
      session.companyId,
      session.customerId
    );

    // Update context with current customer name if available
    if (customer) {
      context.customer.name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email.split('@')[0];
      context.customer.email = customer.email;
    }

    return {
      id: session.id,
      companyId: session.companyId,
      customerId: session.customerId,
      channel: session.channel as CSSession['channel'],
      currentTier: session.currentTier as CSTier,
      status: session.status as CSSessionStatus,
      issueCategory: session.issueCategory as IssueCategory | undefined,
      issueSummary: session.issueSummary || undefined,
      customerSentiment: session.customerSentiment as CustomerSentiment,
      sentimentHistory: (session.sentimentHistory as unknown as SentimentSnapshot[]) || [],
      escalationHistory: (session.escalationHistory as unknown as EscalationEvent[]) || [],
      messages: (session.messages || []).map(m => ({
        id: m.id,
        role: m.role as CSMessage['role'],
        content: m.content,
        timestamp: m.createdAt,
        sentiment: m.sentiment as CustomerSentiment | undefined,
        metadata: m.metadata as CSMessage['metadata'],
      })),
      context,
      resolution: session.resolutionType ? {
        type: session.resolutionType as ResolutionType,
        summary: session.resolutionSummary || '',
        actionsTaken: (session.resolutionActions as string[]) || [],
        customerSatisfaction: session.customerSatisfaction || undefined,
        followUpRequired: session.followUpRequired,
        followUpDate: session.followUpDate || undefined,
      } : undefined,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      resolvedAt: session.resolvedAt || undefined,
      // Add customer info for frontend display
      customer: customer ? {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      } : undefined,
    } as CSSession & { customer?: { firstName: string | null; lastName: string | null; email: string } };
  }

  private async determineStartingTier(companyId: string, channel: string): Promise<CSTier> {
    // Check company CS config
    const config = await this.prisma.cSConfig.findUnique({
      where: { companyId },
    });

    if (config?.channelConfigs) {
      const channelConfigs = config.channelConfigs as Record<string, { startingTier?: CSTier }>;
      if (channelConfigs[channel]?.startingTier) {
        return channelConfigs[channel].startingTier;
      }
    }

    // Default to AI_REP
    return CSTier.AI_REP;
  }

  private async logAIUsage(
    sessionId: string,
    companyId: string,
    tier: CSTier,
    channel: string,
    usage: { messageCount: number; aiMessageCount: number; inputTokens?: number; outputTokens?: number }
  ): Promise<void> {
    try {
      // Get client ID from company
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { clientId: true },
      });

      if (!company) {
        this.logger.warn(`Company ${companyId} not found for AI usage logging`);
        return;
      }

      // Get current billing period
      const now = new Date();
      const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await this.prisma.cSAIUsage.create({
        data: {
          companyId,
          clientId: company.clientId,
          csSessionId: sessionId,
          usageType: 'CHAT_SESSION',
          tier: tier as PrismaCSTier,
          channel,
          messageCount: usage.messageCount,
          aiMessageCount: usage.aiMessageCount,
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          billingPeriod,
          // Cost calculation would be done based on pricing config
          baseCost: 0,
          markupCost: 0,
          totalCost: 0,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log AI usage: ${error}`);
    }
  }

  private getAvailableActions(tier: CSTier) {
    const baseActions = [
      { id: 'view_order', name: 'View Order Details', description: 'Access order information', tier, requiresApproval: false },
      { id: 'track_package', name: 'Track Package', description: 'Get shipping status', tier, requiresApproval: false },
      { id: 'send_email', name: 'Send Email', description: 'Send confirmation email', tier, requiresApproval: false },
    ];

    if (tier === CSTier.AI_MANAGER || tier === CSTier.HUMAN_AGENT) {
      baseActions.push(
        { id: 'process_refund', name: 'Process Refund', description: 'Issue refund to customer', tier, requiresApproval: tier === CSTier.AI_MANAGER },
        { id: 'apply_credit', name: 'Apply Credit', description: 'Add store credit', tier, requiresApproval: false },
        { id: 'modify_subscription', name: 'Modify Subscription', description: 'Change subscription plan', tier, requiresApproval: false },
      );
    }

    return baseActions;
  }

  private getEscalationMessage(fromTier: CSTier, toTier: CSTier, reason: EscalationReason): string {
    if (toTier === CSTier.AI_MANAGER) {
      return `Your conversation has been escalated to an AI Customer Service Manager for additional assistance.`;
    }
    if (toTier === CSTier.HUMAN_AGENT) {
      return `You're being connected with a human customer service representative who will assist you further.`;
    }
    return `Your request is being escalated for additional review.`;
  }

  private getSentimentScore(sentiment: CustomerSentiment): number {
    const scores: Record<CustomerSentiment, number> = {
      [CustomerSentiment.HAPPY]: 1.0,
      [CustomerSentiment.SATISFIED]: 0.75,
      [CustomerSentiment.NEUTRAL]: 0.5,
      [CustomerSentiment.FRUSTRATED]: 0.25,
      [CustomerSentiment.ANGRY]: 0.1,
      [CustomerSentiment.IRATE]: 0,
    };
    return scores[sentiment];
  }

  private extractKeywords(message: string): string[] {
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'was', 'were', 'i', 'you', 'my', 'your'];
    return words.filter(word => word.length > 2 && !stopWords.includes(word));
  }

  /**
   * Get current billing period in YYYY-MM format
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
