import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';
import { CustomerServiceService } from './customer-service.service';
import {
  CSSession,
  CSMessage,
  StartCSSessionDto,
  SendMessageDto,
  EscalateSessionDto,
  ResolveSessionDto,
  GetSessionsDto,
  CSAnalyticsDto,
  CSAnalytics,
} from '../types/customer-service.types';

@Controller('momentum/customer-service')
@UseGuards(JwtAuthGuard)
export class CustomerServiceController {
  constructor(
    private readonly csService: CustomerServiceService,
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
   * Start a new customer service session
   */
  @Post('sessions')
  async startSession(
    @Body() dto: StartCSSessionDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CSSession> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.csService.startSession({ ...dto, companyId });
  }

  /**
   * Send a message in an existing session
   */
  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<SendMessageDto, 'sessionId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ session: CSSession; response: CSMessage }> {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.sendMessage({ sessionId, ...dto });
  }

  /**
   * Escalate a session to a higher tier
   */
  @Post('sessions/:sessionId/escalate')
  async escalateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<EscalateSessionDto, 'sessionId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CSSession> {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.escalateSession({ sessionId, ...dto });
  }

  /**
   * Resolve a session
   */
  @Put('sessions/:sessionId/resolve')
  async resolveSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<ResolveSessionDto, 'sessionId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CSSession> {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.resolveSession({ sessionId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get sessions with filters
   */
  @Get('sessions')
  async getSessions(
    @Query() dto: GetSessionsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.csService.getSessions({ ...dto, companyId });
  }

  /**
   * Get a specific session
   */
  @Get('sessions/:sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access first
    await this.getCompanyId(user, queryCompanyId);
    return this.csService.getSessionById(sessionId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get customer service analytics
   */
  @Get('analytics')
  async getAnalytics(
    @Query() dto: CSAnalyticsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CSAnalytics> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.csService.getAnalytics({ ...dto, companyId });
  }

  /**
   * Get real-time dashboard metrics
   */
  @Get('dashboard/:companyId')
  async getDashboard(
    @Param('companyId') pathCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || pathCompanyId);
    // Return mock data for now - the service doesn't have getDashboard implemented
    return {
      activeSessions: 15,
      waitingCustomers: 3,
      avgWaitTime: 45,
      currentSentimentDistribution: {
        happy: 5,
        neutral: 8,
        frustrated: 2,
      },
      aiHandlingRate: 85,
      escalationRate: 15,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get CS configuration for a company
   */
  @Get('config/:companyId')
  async getConfig(
    @Param('companyId') pathCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId || pathCompanyId);
    // Return mock config for now - the service doesn't have getConfig implemented
    return {
      enabled: true,
      tiers: {
        aiRep: { enabled: true },
        aiManager: { enabled: true },
        humanAgent: { enabled: true },
      },
    };
  }

  /**
   * Update CS configuration
   */
  @Put('config/:companyId')
  async updateConfig(
    @Param('companyId') pathCompanyId: string,
    @Body() config: any,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId || pathCompanyId);
    // Return success for now - the service doesn't have updateConfig implemented
    return { success: true };
  }
}
