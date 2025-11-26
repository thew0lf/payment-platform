import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  constructor(private readonly csService: CustomerServiceService) {}

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start a new customer service session
   */
  @Post('sessions')
  async startSession(@Body() dto: StartCSSessionDto): Promise<CSSession> {
    return this.csService.startSession(dto);
  }

  /**
   * Send a message in an existing session
   */
  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<SendMessageDto, 'sessionId'>,
  ): Promise<{ session: CSSession; response: CSMessage }> {
    return this.csService.sendMessage({ sessionId, ...dto });
  }

  /**
   * Escalate a session to a higher tier
   */
  @Post('sessions/:sessionId/escalate')
  async escalateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<EscalateSessionDto, 'sessionId'>,
  ): Promise<CSSession> {
    return this.csService.escalateSession({ sessionId, ...dto });
  }

  /**
   * Resolve a session
   */
  @Put('sessions/:sessionId/resolve')
  async resolveSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: Omit<ResolveSessionDto, 'sessionId'>,
  ): Promise<CSSession> {
    return this.csService.resolveSession({ sessionId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get sessions with filters
   */
  @Get('sessions')
  async getSessions(@Query() dto: GetSessionsDto) {
    // Implementation would call csService.getSessions
    return { sessions: [], total: 0 };
  }

  /**
   * Get a specific session
   */
  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    // Implementation would call csService.getSession
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get customer service analytics
   */
  @Get('analytics')
  async getAnalytics(@Query() dto: CSAnalyticsDto): Promise<CSAnalytics> {
    return this.csService.getAnalytics(dto);
  }

  /**
   * Get real-time dashboard metrics
   */
  @Get('dashboard/:companyId')
  async getDashboard(@Param('companyId') companyId: string) {
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
  async getConfig(@Param('companyId') companyId: string) {
    // Implementation would fetch from database
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
    @Param('companyId') companyId: string,
    @Body() config: any,
  ) {
    // Implementation would save to database
    return { success: true };
  }
}
