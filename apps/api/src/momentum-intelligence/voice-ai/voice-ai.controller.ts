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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CALL MANAGEMENT (Authenticated)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initiate outbound call
   * POST /api/momentum/voice/call
   */
  @Post('call')
  @UseGuards(JwtAuthGuard)
  async initiateCall(@Body() dto: InitiateCallDto) {
    return this.voiceAiService.initiateOutboundCall(
      dto.companyId,
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
  async getCalls(@Query() query: GetCallsQuery) {
    const { companyId } = query;
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
  async getCall(@Param('callId') callId: string) {
    return this.voiceAiService.getCallById(callId);
  }

  /**
   * Get call stats for dashboard
   * GET /api/momentum/voice/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getCallStats(@Query('companyId') companyId: string) {
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

    // Estimate revenue (simplified - would use actual pricing)
    const estRevenue = totalMinutes * 0.15; // $0.15/min example rate

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
    @Query('companyId') companyId: string,
    @Query('type') type?: string,
  ) {
    return this.voiceAiService.getScripts(companyId, type as any);
  }

  /**
   * Create voice script
   * POST /api/momentum/voice/scripts
   */
  @Post('scripts')
  @UseGuards(JwtAuthGuard)
  async createScript(
    @Query('companyId') companyId: string,
    @Body() dto: CreateScriptDto,
  ) {
    return this.voiceAiService.createScript(companyId, dto);
  }

  /**
   * Update voice script
   * PATCH /api/momentum/voice/scripts/:scriptId
   */
  @Patch('scripts/:scriptId')
  @UseGuards(JwtAuthGuard)
  async updateScript(
    @Param('scriptId') scriptId: string,
    @Body() dto: Partial<CreateScriptDto>,
  ) {
    return this.voiceAiService.updateScript(scriptId, dto);
  }

  /**
   * Check Twilio configuration status
   * GET /api/momentum/voice/status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async checkStatus(@Query('companyId') companyId: string) {
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
   */
  @Post('escalate')
  @HttpCode(HttpStatus.OK)
  async handleEscalate() {
    // This would transfer to a human agent queue
    // For now, return a message indicating escalation
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while I connect you with a team member.</Say>
  <Enqueue>support</Enqueue>
</Response>`;
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
    @Query('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
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
