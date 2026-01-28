import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { VoiceAIService } from './voice-ai.service';
import { PrismaService } from '../../prisma/prisma.service';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

interface InitiateCallDto {
  companyId: string;
  customerId: string;
  scriptId: string;
  priority?: string;
}

interface GetCallsQuery {
  companyId: string;
  status?: string;
  outcome?: string;
  direction?: string;
  limit?: string;
}

interface CreateScriptDto {
  name: string;
  type: string;
  description?: string;
  opening: Record<string, unknown>;
  diagnosis: Record<string, unknown>;
  interventions: Record<string, unknown>[];
  closing: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER - Routes at /api/momentum/voice/*
// ═══════════════════════════════════════════════════════════════

@Controller('momentum/voice')
export class VoiceAIController {
  constructor(
    private readonly voiceAiService: VoiceAIService,
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ==========================================================================
  // HELPERS
  // ==========================================================================

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
  // CALL MANAGEMENT (Authenticated)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initiate outbound call
   * POST /api/momentum/voice/call
   */
  @Post('call')
  @UseGuards(JwtAuthGuard)
  async initiateCall(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiateCallDto,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.voiceAiService.initiateOutboundCall(
      companyId,
      dto.customerId,
      dto.scriptId,
      dto.priority,
    );
  }

  /**
   * Get call history
   * GET /api/momentum/voice/calls
   */
  @Get('calls')
  @UseGuards(JwtAuthGuard)
  async getCalls(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetCallsQuery,
  ) {
    const companyId = await this.getCompanyId(user, query.companyId);
    const limit = query.limit ? parseInt(query.limit) : 50;

    return this.voiceAiService.getCalls(companyId, {
      status: query.status as any,
      outcome: query.outcome as any,
      direction: query.direction as any,
      limit,
    });
  }

  /**
   * Get call by ID
   * GET /api/momentum/voice/calls/:callId
   */
  @Get('calls/:callId')
  @UseGuards(JwtAuthGuard)
  async getCall(
    @CurrentUser() user: AuthenticatedUser,
    @Param('callId') callId: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    // Validate company access if provided
    if (queryCompanyId) {
      await this.getCompanyId(user, queryCompanyId);
    }
    return this.voiceAiService.getCallById(callId);
  }

  /**
   * Get call stats for dashboard
   * GET /api/momentum/voice/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getCallStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    // Get call statistics
    const totalCalls = await this.prisma.voiceCall.count({
      where: { companyId },
    });

    const inbound = await this.prisma.voiceCall.count({
      where: { companyId, direction: 'INBOUND' },
    });

    const outbound = await this.prisma.voiceCall.count({
      where: { companyId, direction: 'OUTBOUND' },
    });

    const completedCalls = await this.prisma.voiceCall.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        duration: { not: null },
      },
      select: { duration: true },
    });

    const avgDuration = completedCalls.length > 0
      ? completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / completedCalls.length
      : 0;

    const successfulOutcomes = await this.prisma.voiceCall.count({
      where: {
        companyId,
        outcome: { in: ['SAVED', 'OFFER_ACCEPTED'] },
      },
    });

    const successRate = totalCalls > 0 ? (successfulOutcomes / totalCalls) * 100 : 0;

    const totalMinutes = completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / 60;

    // Get pricing from database - find company's organization for pricing lookup
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { client: { select: { organizationId: true } } },
    });

    let voicePerMinuteRate = 0.50; // Default rate in dollars ($0.50/min)
    if (company?.client?.organizationId) {
      const pricing = await this.prisma.cSAIPricing.findFirst({
        where: { organizationId: company.client.organizationId },
      });
      if (pricing) {
        voicePerMinuteRate = pricing.voicePerMinuteCents / 100; // Convert cents to dollars
      }
    }

    const estRevenue = totalMinutes * voicePerMinuteRate;

    return {
      totalCalls,
      inbound,
      outbound,
      avgDuration: Math.round(avgDuration),
      successRate: Math.round(successRate),
      totalMinutes: Math.round(totalMinutes),
      estRevenue: Math.round(estRevenue * 100) / 100,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // VOICE SCRIPTS (Authenticated)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get voice scripts
   * GET /api/momentum/voice/scripts
   */
  @Get('scripts')
  @UseGuards(JwtAuthGuard)
  async getScripts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
    @Query('type') type?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.voiceAiService.getScripts(companyId, type as any);
  }

  /**
   * Create voice script
   * POST /api/momentum/voice/scripts
   */
  @Post('scripts')
  @UseGuards(JwtAuthGuard)
  async createScript(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
    @Body() dto?: CreateScriptDto,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.voiceAiService.createScript(companyId, dto);
  }

  /**
   * Update voice script
   * PATCH /api/momentum/voice/scripts/:scriptId
   */
  @Patch('scripts/:scriptId')
  @UseGuards(JwtAuthGuard)
  async updateScript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scriptId') scriptId: string,
    @Body() dto: Partial<CreateScriptDto>,
    @Query('companyId') queryCompanyId?: string,
  ) {
    // Validate company access if provided
    if (queryCompanyId) {
      await this.getCompanyId(user, queryCompanyId);
    }
    return this.voiceAiService.updateScript(scriptId, dto);
  }

  /**
   * Check Twilio configuration status
   * GET /api/momentum/voice/status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async checkStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId?: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    const configured = await this.voiceAiService.isTwilioConfigured(companyId);
    return {
      configured,
      status: configured ? 'active' : 'not_configured',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TWILIO WEBHOOKS (Public - No Auth)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle inbound call webhook
   * POST /api/momentum/voice/inbound
   */
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  async handleInbound(@Body() webhookData: any) {
    const twiml = await this.voiceAiService.handleInboundCall(webhookData);
    return twiml;
  }

  /**
   * Handle speech result webhook
   * POST /api/momentum/voice/speech
   */
  @Post('speech')
  @HttpCode(HttpStatus.OK)
  async handleSpeech(@Body() webhookData: any) {
    const { CallSid, SpeechResult, Confidence } = webhookData;
    const twiml = await this.voiceAiService.processSpeechResult(
      CallSid,
      SpeechResult || '',
      parseFloat(Confidence) || 0,
    );
    return twiml;
  }

  /**
   * Handle call status callback
   * POST /api/momentum/voice/status
   */
  @Post('status-callback')
  @HttpCode(HttpStatus.OK)
  async handleStatus(@Body() webhookData: any) {
    await this.voiceAiService.handleCallStatusUpdate(webhookData);
    return { success: true };
  }

  /**
   * Handle escalation to human
   * POST /api/momentum/voice/escalate
   *
   * This webhook is called when a call needs to be transferred to a human agent.
   * It looks up the agent phone number from CSConfig and transfers the call.
   */
  @Post('escalate')
  @HttpCode(HttpStatus.OK)
  async handleEscalate(@Body() webhookData: any) {
    const { CallSid } = webhookData;

    // Find the voice call record
    const voiceCall = await this.prisma.voiceCall.findUnique({
      where: { twilioCallSid: CallSid },
    });

    if (!voiceCall) {
      // No call record found - return generic message
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I'm sorry, there was an error transferring your call. Please try calling back.</Say>
  <Hangup/>
</Response>`;
    }

    // Get company's CS configuration
    const csConfig = await this.prisma.cSConfig.findUnique({
      where: { companyId: voiceCall.companyId },
    });

    // Get human agent config with escalation phone
    const humanAgentConfig = (csConfig?.humanAgentConfig as any) || {};
    const escalationPhone = humanAgentConfig.escalationPhone || humanAgentConfig.escalationPhoneBackup;

    if (!escalationPhone) {
      // No escalation phone configured - use fallback message
      const fallbackMessage = humanAgentConfig.fallbackMessage ||
        "I'm sorry, no agents are available right now. Please try again during business hours or leave a message.";

      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${fallbackMessage}</Say>
  <Hangup/>
</Response>`;
    }

    // Transfer the call using the service method
    const transferred = await this.voiceAiService.transferToHuman(
      voiceCall.companyId,
      CallSid,
      escalationPhone,
    );

    if (transferred) {
      // Send SMS notification to agent if configured
      if (humanAgentConfig.notifyOnEscalation) {
        const notificationPhone = humanAgentConfig.notificationPhone || escalationPhone;
        const customer = await this.prisma.customer.findUnique({
          where: { id: voiceCall.customerId },
          select: { firstName: true, lastName: true, phone: true },
        });

        const customerName = customer
          ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.phone
          : voiceCall.fromNumber;

        await this.voiceAiService.sendSmsNotification(
          voiceCall.companyId,
          notificationPhone,
          `Incoming escalation: Customer ${customerName} has been transferred to you. Call SID: ${CallSid.slice(-8)}`,
        ).catch(err => {
          // Log but don't fail if SMS notification fails
          console.warn('Failed to send SMS notification:', err.message);
        });
      }

      // The transferToHuman method handles the TwiML update via Twilio API
      // Return empty response since transfer TwiML is already applied
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response/>`;
    } else {
      // Transfer failed - use fallback
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I'm sorry, we were unable to connect you with an agent. Please try again in a few minutes.</Say>
  <Hangup/>
</Response>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BILLING & USAGE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get voice AI usage for billing
   * GET /api/momentum/voice/usage
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    // Get CS AI usage records for voice calls
    const usage = await this.prisma.cSAIUsage.findMany({
      where: {
        companyId,
        voiceCallId: { not: null },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalCalls = usage.length;
    const totalMinutes = usage.reduce((sum, u) => {
      const mins = u.durationSeconds ? u.durationSeconds / 60 : 0;
      return sum + mins;
    }, 0);
    const totalCost = usage.reduce((sum, u) => sum + u.totalCost, 0);

    return {
      usage,
      summary: {
        totalCalls,
        totalMinutes: Math.round(totalMinutes * 100) / 100,
        totalCost: Math.round(totalCost) / 100, // Convert cents to dollars
      },
    };
  }
}
