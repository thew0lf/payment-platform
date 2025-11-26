import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
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
} from '../types/customer-service.types';

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async startSession(dto: StartCSSessionDto): Promise<CSSession> {
    this.logger.log(`Starting CS session for customer ${dto.customerId}`);

    // Build customer context
    const context = await this.buildCustomerContext(dto.companyId, dto.customerId);

    // Determine starting tier based on channel and company config
    const startingTier = await this.determineStartingTier(dto.companyId, dto.channel);

    // Create the session
    const session: CSSession = {
      id: this.generateSessionId(),
      companyId: dto.companyId,
      customerId: dto.customerId,
      channel: dto.channel,
      currentTier: startingTier,
      status: CSSessionStatus.ACTIVE,
      issueCategory: dto.issueCategory,
      customerSentiment: CustomerSentiment.NEUTRAL,
      sentimentHistory: [{
        sentiment: CustomerSentiment.NEUTRAL,
        score: 0.5,
        timestamp: new Date(),
      }],
      escalationHistory: [],
      messages: [],
      context,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add initial message if provided
    if (dto.initialMessage) {
      const analyzedMessage = await this.analyzeMessage(dto.initialMessage);
      session.messages.push({
        id: this.generateMessageId(),
        role: 'customer',
        content: dto.initialMessage,
        timestamp: new Date(),
        sentiment: analyzedMessage.sentiment,
      });
      session.customerSentiment = analyzedMessage.sentiment;
      session.issueCategory = analyzedMessage.category || dto.issueCategory;
    }

    // Generate AI welcome response
    const welcomeResponse = await this.generateAIResponse(session, startingTier);
    session.messages.push(welcomeResponse);

    // Emit session started event
    this.eventEmitter.emit('cs.session.started', {
      sessionId: session.id,
      companyId: dto.companyId,
      customerId: dto.customerId,
      tier: startingTier,
      channel: dto.channel,
    });

    this.logger.log(`CS session ${session.id} started with tier ${startingTier}`);
    return session;
  }

  async sendMessage(dto: SendMessageDto): Promise<{ session: CSSession; response: CSMessage }> {
    // In a real implementation, we'd fetch from database
    // For now, we'll simulate the flow
    const session = await this.getSession(dto.sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (session.status !== CSSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is not active`);
    }

    // Analyze the customer's message
    const analyzedMessage = await this.analyzeMessage(dto.message);

    // Add customer message
    const customerMessage: CSMessage = {
      id: this.generateMessageId(),
      role: 'customer',
      content: dto.message,
      timestamp: new Date(),
      sentiment: analyzedMessage.sentiment,
    };
    session.messages.push(customerMessage);

    // Update sentiment tracking
    session.sentimentHistory.push({
      sentiment: analyzedMessage.sentiment,
      score: this.getSentimentScore(analyzedMessage.sentiment),
      timestamp: new Date(),
      trigger: analyzedMessage.trigger,
    });
    session.customerSentiment = analyzedMessage.sentiment;

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
    const aiResponse = await this.generateAIResponse(session, session.currentTier);
    session.messages.push(aiResponse);

    session.updatedAt = new Date();

    // Emit message event
    this.eventEmitter.emit('cs.message.received', {
      sessionId: session.id,
      sentiment: analyzedMessage.sentiment,
      requiresEscalation: escalationCheck.shouldEscalate,
    });

    return { session, response: aiResponse };
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
    session.escalationHistory.push(escalationEvent);
    session.currentTier = dto.targetTier;

    // Add system message about escalation
    const systemMessage: CSMessage = {
      id: this.generateMessageId(),
      role: 'system',
      content: this.getEscalationMessage(previousTier, dto.targetTier, dto.reason),
      timestamp: new Date(),
    };
    session.messages.push(systemMessage);

    // If escalating to human, update status
    if (dto.targetTier === CSTier.HUMAN_AGENT) {
      session.status = CSSessionStatus.ESCALATED;
    }

    // Generate response from new tier
    const aiResponse = await this.generateAIResponse(session, dto.targetTier);
    session.messages.push(aiResponse);

    session.updatedAt = new Date();

    // Emit escalation event
    this.eventEmitter.emit('cs.session.escalated', {
      sessionId: session.id,
      fromTier: previousTier,
      toTier: dto.targetTier,
      reason: dto.reason,
    });

    this.logger.log(`Session ${session.id} escalated from ${previousTier} to ${dto.targetTier}`);
    return session;
  }

  async resolveSession(dto: ResolveSessionDto): Promise<CSSession> {
    const session = await this.getSession(dto.sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    session.status = CSSessionStatus.RESOLVED;
    session.resolution = {
      type: dto.resolutionType,
      summary: dto.summary,
      actionsTaken: dto.actionsTaken,
      followUpRequired: dto.followUpRequired || false,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
    };
    session.resolvedAt = new Date();
    session.updatedAt = new Date();

    // Add resolution message
    const resolutionMessage: CSMessage = {
      id: this.generateMessageId(),
      role: 'system',
      content: `Session resolved: ${dto.resolutionType}. ${dto.summary}`,
      timestamp: new Date(),
    };
    session.messages.push(resolutionMessage);

    // Emit resolution event
    this.eventEmitter.emit('cs.session.resolved', {
      sessionId: session.id,
      resolutionType: dto.resolutionType,
      tier: session.currentTier,
      duration: session.resolvedAt.getTime() - session.createdAt.getTime(),
    });

    return session;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT & ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  private async buildCustomerContext(
    companyId: string,
    customerId: string,
  ): Promise<CustomerServiceContext> {
    // In production, this would fetch from database
    return {
      customer: {
        id: customerId,
        name: 'Customer Name',
        email: 'customer@example.com',
        tier: 'Gold',
        lifetimeValue: 1500,
        tenureMonths: 12,
        rewardsBalance: 45.50,
        isVIP: false,
        previousEscalations: 0,
      },
      recentHistory: [],
      orderHistory: [],
      openTickets: [],
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
  // AI RESPONSE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async generateAIResponse(session: CSSession, tier: CSTier): Promise<CSMessage> {
    // In production, this would call Anthropic Claude API
    // For now, generate contextual responses based on tier and situation

    const role = tier === CSTier.AI_REP ? 'ai_rep' : tier === CSTier.AI_MANAGER ? 'ai_manager' : 'human_agent';

    let content: string;
    let suggestedActions: string[] = [];
    let internalNotes: string | undefined;

    if (session.messages.length <= 1) {
      // Welcome message
      content = this.generateWelcomeMessage(tier, session.context.customer.name);
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
      id: this.generateMessageId(),
      role,
      content,
      timestamp: new Date(),
      metadata: {
        suggestedActions,
        internalNotes,
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
        return `I'm sorry to hear you're experiencing quality issues. ${managerPrefix}I can help arrange a replacement or refund for you right away.`;
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
    // In production, this would query the database
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalSessions: 1250,
        resolvedSessions: 1150,
        resolutionRate: 92,
        avgResolutionTime: 8.5,
        avgMessagesPerSession: 6.2,
        customerSatisfactionAvg: 4.3,
      },
      byTier: [
        { tier: CSTier.AI_REP, sessions: 800, resolved: 720, resolutionRate: 90, avgTime: 5.2 },
        { tier: CSTier.AI_MANAGER, sessions: 350, resolved: 330, resolutionRate: 94, avgTime: 10.5 },
        { tier: CSTier.HUMAN_AGENT, sessions: 100, resolved: 100, resolutionRate: 100, avgTime: 15.3 },
      ],
      byChannel: [
        { channel: 'chat', sessions: 700, resolved: 650, avgTime: 6.5 },
        { channel: 'voice', sessions: 350, resolved: 320, avgTime: 12.3 },
        { channel: 'email', sessions: 200, resolved: 180, avgTime: 24.0 },
      ],
      byCategory: [
        { category: IssueCategory.SHIPPING, count: 400, avgResolutionTime: 5.5, topResolutions: [ResolutionType.INFORMATION_PROVIDED, ResolutionType.ISSUE_RESOLVED] },
        { category: IssueCategory.BILLING, count: 300, avgResolutionTime: 8.2, topResolutions: [ResolutionType.ISSUE_RESOLVED, ResolutionType.CREDIT_APPLIED] },
        { category: IssueCategory.REFUND, count: 250, avgResolutionTime: 10.5, topResolutions: [ResolutionType.REFUND_PROCESSED] },
      ],
      escalations: {
        total: 450,
        byReason: {
          [EscalationReason.IRATE_CUSTOMER]: 85,
          [EscalationReason.REFUND_REQUEST]: 200,
          [EscalationReason.COMPLEX_ISSUE]: 75,
          [EscalationReason.REPEAT_CONTACT]: 45,
          [EscalationReason.HIGH_VALUE_CUSTOMER]: 30,
          [EscalationReason.LEGAL_MENTION]: 5,
          [EscalationReason.SOCIAL_MEDIA_THREAT]: 10,
          [EscalationReason.REFUND_OVER_THRESHOLD]: 0,
          [EscalationReason.CUSTOMER_REQUEST]: 0,
          [EscalationReason.POLICY_EXCEPTION]: 0,
          [EscalationReason.ESCALATED_COMPLAINT]: 0,
          [EscalationReason.TECHNICAL_LIMITATION]: 0,
        },
        avgEscalationTime: 3.2,
        escalationRate: 36,
      },
      sentiment: {
        distribution: {
          [CustomerSentiment.HAPPY]: 250,
          [CustomerSentiment.SATISFIED]: 500,
          [CustomerSentiment.NEUTRAL]: 300,
          [CustomerSentiment.FRUSTRATED]: 150,
          [CustomerSentiment.ANGRY]: 40,
          [CustomerSentiment.IRATE]: 10,
        },
        irateIncidents: 10,
        sentimentImprovement: 78,
      },
      topIssues: [
        { issue: 'Order tracking', count: 180, avgResolutionTime: 3.5 },
        { issue: 'Billing discrepancy', count: 120, avgResolutionTime: 8.2 },
        { issue: 'Refund request', count: 100, avgResolutionTime: 10.5 },
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async getSession(sessionId: string): Promise<CSSession | null> {
    // In production, fetch from database
    // For now, return null to simulate not found
    return null;
  }

  private async determineStartingTier(companyId: string, channel: string): Promise<CSTier> {
    // In production, check company config
    return CSTier.AI_REP;
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

  private generateSessionId(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
