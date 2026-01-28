import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';
import { CustomerServiceService } from '../customer-service/customer-service.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CSTier,
  CSSessionStatus,
  IssueCategory,
  ResolutionType,
} from '../types/customer-service.types';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

interface StartSessionDto {
  companyId: string;
  customerId: string;
  channel: 'email' | 'chat' | 'voice' | 'sms';
  issueCategory?: IssueCategory;
  initialMessage?: string;
}

interface SendMessageDto {
  message: string;
}

interface EscalateDto {
  reason: string;
  targetTier: CSTier;
  notes?: string;
}

interface ResolveDto {
  resolutionType: ResolutionType;
  summary: string;
  actionsTaken: string[];
  followUpRequired?: boolean;
  followUpDate?: string;
}

interface GetSessionsQuery {
  companyId: string;
  status?: CSSessionStatus;
  tier?: CSTier;
  channel?: string;
  limit?: string;
  offset?: string;
}

interface GetAnalyticsQuery {
  companyId: string;
  startDate: string;
  endDate: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER - Routes at /api/momentum/cs/*
// ═══════════════════════════════════════════════════════════════

@Controller('momentum/cs')
@UseGuards(JwtAuthGuard)
export class CSAIController {
  constructor(
    private readonly csService: CustomerServiceService,
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get company ID with proper validation based on user scope
   */
  private async getCompanyId(user: AuthenticatedUser, queryCompanyId?: string): Promise<string> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    if (queryCompanyId) {
      const canAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Hmm, you don\'t have access to that company. Double-check your permissions or try a different one.');
      }
      return queryCompanyId;
    }
    throw new BadRequestException('Company ID is required. Please select a company or provide companyId parameter.');
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start a new CS session
   * POST /api/momentum/cs/sessions
   */
  @Post('sessions')
  async startSession(
    @Body() dto: StartSessionDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.csService.startSession({ ...dto, companyId });
  }

  /**
   * Get sessions list
   * GET /api/momentum/cs/sessions
   */
  @Get('sessions')
  async getSessions(
    @Query() query: GetSessionsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, query.companyId);
    const { status, tier, channel } = query;
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;

    // Fetch sessions (CSSession doesn't have soft delete)
    const sessions = await this.prisma.cSSession.findMany({
      where: {
        companyId,
        ...(status && { status }),
        ...(tier && { currentTier: tier }),
        ...(channel && { channel }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Fetch customer details separately for each session (with soft-delete filter)
    const sessionsWithCustomers = await Promise.all(
      sessions.map(async (session) => {
        const customer = await this.prisma.customer.findFirst({
          where: { id: session.customerId, deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        return { ...session, customer };
      }),
    );

    const total = await this.prisma.cSSession.count({
      where: {
        companyId,
        ...(status && { status }),
        ...(tier && { currentTier: tier }),
        ...(channel && { channel }),
      },
    });

    return { items: sessionsWithCustomers, total };
  }

  /**
   * Get session by ID
   * GET /api/momentum/cs/sessions/:sessionId
   */
  @Get('sessions/:sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    // CSSession doesn't have soft delete
    const session = await this.prisma.cSSession.findFirst({
      where: {
        id: sessionId,
        companyId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or you don\'t have access to it.');
    }

    // Fetch customer separately with soft-delete filter
    const customer = await this.prisma.customer.findFirst({
      where: { id: session.customerId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    // Transform to match frontend expectations
    return {
      ...session,
      customer,
      sentimentHistory: session.sentimentHistory || [],
      escalationHistory: session.escalationHistory || [],
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
        sentiment: m.sentiment,
        metadata: m.metadata,
      })),
    };
  }

  /**
   * Send message in session
   * POST /api/momentum/cs/sessions/:sessionId/messages
   */
  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.sendMessage({ sessionId, message: dto.message });
  }

  /**
   * Escalate session
   * POST /api/momentum/cs/sessions/:sessionId/escalate
   */
  @Post('sessions/:sessionId/escalate')
  async escalateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: EscalateDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.escalateSession({
      sessionId,
      reason: dto.reason as any,
      targetTier: dto.targetTier,
      notes: dto.notes,
    });
  }

  /**
   * Resolve session
   * POST /api/momentum/cs/sessions/:sessionId/resolve
   */
  @Post('sessions/:sessionId/resolve')
  async resolveSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: ResolveDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.resolveSession({
      sessionId,
      resolutionType: dto.resolutionType,
      summary: dto.summary,
      actionsTaken: dto.actionsTaken,
      followUpRequired: dto.followUpRequired,
      followUpDate: dto.followUpDate,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get CS analytics
   * GET /api/momentum/cs/analytics
   */
  @Get('analytics')
  async getAnalytics(
    @Query() query: GetAnalyticsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, query.companyId);
    return this.csService.getAnalytics({
      companyId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  /**
   * Get queue stats
   * GET /api/momentum/cs/queue/stats
   */
  @Get('queue/stats')
  async getQueueStats(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    // Get active session counts by tier (CSSession doesn't have soft delete)
    const activeSessions = await this.prisma.cSSession.count({
      where: { companyId, status: 'ACTIVE' },
    });

    const byTier = await this.prisma.cSSession.groupBy({
      by: ['currentTier'],
      where: { companyId, status: 'ACTIVE' },
      _count: { id: true },
    });

    const tierCounts: Record<string, number> = {
      AI_REP: 0,
      AI_MANAGER: 0,
      HUMAN_AGENT: 0,
    };
    byTier.forEach((t) => {
      tierCounts[t.currentTier] = t._count.id;
    });

    // Calculate avg wait time from session data
    const recentSessions = await this.prisma.cSSession.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      select: { createdAt: true },
    });

    const avgWaitTime = recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((sum, s) => {
            const waitMs = Date.now() - s.createdAt.getTime();
            return sum + waitMs / 1000; // Convert to seconds
          }, 0) / recentSessions.length
        )
      : 0;

    return {
      activeSessions,
      queuedSessions: 0,
      avgWaitTime,
      activeAgents: tierCounts.HUMAN_AGENT, // Count of sessions with human agents
      byTier: tierCounts,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BILLING & USAGE (CS AI specific)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get CS AI usage for billing
   * GET /api/momentum/cs/usage
   */
  @Get('usage')
  async getUsage(
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    const usage = await this.prisma.cSAIUsage.findMany({
      where: {
        companyId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get summary
    const summary = await this.prisma.cSAIUsageSummary.findFirst({
      where: {
        companyId,
        periodStart: { lte: new Date(endDate) },
        periodEnd: { gte: new Date(startDate) },
      },
    });

    return { usage, summary };
  }

  /**
   * Get CS AI pricing for organization
   * GET /api/momentum/cs/pricing
   */
  @Get('pricing')
  async getPricing(
    @Query('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Organization-level users can access pricing
    // Get organization-specific pricing or return null for default
    if (organizationId) {
      const pricing = await this.prisma.cSAIPricing.findFirst({
        where: { organizationId },
      });
      return pricing;
    }

    // Return first pricing record as default
    const defaultPricing = await this.prisma.cSAIPricing.findFirst();
    return defaultPricing;
  }
}
