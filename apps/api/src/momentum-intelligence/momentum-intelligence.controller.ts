import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Headers,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ScopeType } from '@prisma/client';
import { IntentDetectionService } from './intent-detection/intent-detection.service';
import { CustomerSaveService } from './customer-save/customer-save.service';
import { VoiceAIService } from './voice-ai/voice-ai.service';
import { ContentGenerationService } from './content-generation/content-generation.service';
import { UpsellService } from './upsell/upsell.service';
import { AnalyticsService } from './analytics/analytics.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  CalculateChurnRiskDto,
  BatchCalculateChurnRiskDto,
  InitiateSaveFlowDto,
  ProgressSaveStageDto,
  CompleteSaveFlowDto,
  UpdateSaveFlowConfigDto,
  InitiateOutboundCallDto,
  CreateVoiceScriptDto,
  UpdateVoiceScriptDto,
  TwilioInboundWebhookDto,
  TwilioStatusCallbackDto,
  GenerateContentDto,
  ApproveContentDto,
  GetUpsellRecommendationDto,
  RecordOfferPresentationDto,
  RecordOfferAcceptanceDto,
  GetAnalyticsDto,
} from './dto/momentum.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('momentum')
export class MomentumIntelligenceController {
  constructor(
    private readonly intentDetectionService: IntentDetectionService,
    private readonly customerSaveService: CustomerSaveService,
    private readonly voiceAIService: VoiceAIService,
    private readonly contentGenerationService: ContentGenerationService,
    private readonly upsellService: UpsellService,
    private readonly analyticsService: AnalyticsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getCompanyId(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // COMPANY scoped users use their own company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // Use companyId from user context if available
    if (user.companyId) {
      return user.companyId;
    }

    // CLIENT/ORG users need to specify or have access
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
        throw new ForbiddenException(
          "Hmm, you don't have access to that company. Double-check your permissions or try a different one.",
        );
      }
      return queryCompanyId;
    }

    throw new BadRequestException(
      'Company ID is required. Please select a company or provide companyId parameter.',
    );
  }

  // =============================================================================
  // INTENT DETECTION ENDPOINTS
  // =============================================================================

  @Post('intent/calculate')
  @UseGuards(JwtAuthGuard)
  async calculateChurnRisk(
    @Body() dto: CalculateChurnRiskDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.intentDetectionService.calculateChurnRisk(companyId, dto.customerId);
  }

  @Post('intent/batch')
  @UseGuards(JwtAuthGuard)
  async batchCalculateChurnRisk(
    @Body() dto: BatchCalculateChurnRiskDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    const results = await this.intentDetectionService.batchCalculateChurnRisk(
      companyId,
      dto.customerIds,
    );
    return Object.fromEntries(results);
  }

  @Get('intent/:companyId/:customerId')
  @UseGuards(JwtAuthGuard)
  async getCustomerIntent(
    @Param('companyId') paramCompanyId: string,
    @Param('customerId') customerId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.intentDetectionService.getCustomerIntent(companyId, customerId);
  }

  @Get('intent/high-risk/:companyId')
  @UseGuards(JwtAuthGuard)
  async getHighRiskCustomers(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('riskLevel') riskLevel: string,
    @Query('urgency') urgency: string,
    @Query('limit') limit: string,
    @Query('minScore') minScore: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    const intents = await this.intentDetectionService.getHighRiskCustomers(companyId, {
      riskLevel: riskLevel as any,
      urgency: urgency as any,
      limit: limit ? parseInt(limit) : undefined,
    });

    // Filter by minScore if provided
    let filteredIntents = intents;
    if (minScore) {
      const minScoreNum = parseInt(minScore);
      filteredIntents = intents.filter((intent: any) => intent.churnScore >= minScoreNum);
    }

    // Transform to HighRiskCustomer format expected by frontend
    const items = filteredIntents.map((intent: any) => ({
      customerId: intent.customerId,
      customerName: intent.customer
        ? `${intent.customer.firstName || ''} ${intent.customer.lastName || ''}`.trim() || intent.customer.email
        : 'Unknown',
      customerEmail: intent.customer?.email || '',
      riskScore: intent.churnScore || 0,
      riskLevel: intent.churnRisk || 'LOW',
      topFactors: intent.primaryFactors || [],
      lifetimeValue: 0, // Would need to calculate from orders
      lastOrderDate: undefined,
      trend: 'STABLE' as const,
    }));

    return {
      items,
      total: items.length,
    };
  }

  // =============================================================================
  // CUSTOMER SAVE ENDPOINTS
  // =============================================================================

  @Post('save/initiate')
  @UseGuards(JwtAuthGuard)
  async initiateSaveFlow(
    @Body() dto: InitiateSaveFlowDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.customerSaveService.initiateSaveFlow(
      companyId,
      dto.customerId,
      dto.trigger,
    );
  }

  @Post('save/:attemptId/stage')
  @UseGuards(JwtAuthGuard)
  async progressSaveStage(
    @Param('attemptId') attemptId: string,
    @Body() dto: ProgressSaveStageDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access (attemptId is validated by service)
    await this.getCompanyId(user, queryCompanyId);
    return this.customerSaveService.progressToNextStage(
      attemptId,
      dto.response,
      dto.selectedOption,
    );
  }

  @Post('save/:attemptId/complete')
  @UseGuards(JwtAuthGuard)
  async completeSaveFlow(
    @Param('attemptId') attemptId: string,
    @Body() dto: CompleteSaveFlowDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access (attemptId is validated by service)
    await this.getCompanyId(user, queryCompanyId);
    return this.customerSaveService.completeSaveFlow(attemptId, dto.outcome as any, dto.details);
  }

  @Get('save/config/:companyId')
  @UseGuards(JwtAuthGuard)
  async getSaveFlowConfig(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.customerSaveService.getFlowConfig(companyId);
  }

  @Put('save/config/:companyId')
  @UseGuards(JwtAuthGuard)
  async updateSaveFlowConfig(
    @Param('companyId') paramCompanyId: string,
    @Body() dto: UpdateSaveFlowConfigDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.customerSaveService.updateFlowConfig(companyId, dto);
  }

  // =============================================================================
  // VOICE AI ENDPOINTS
  // =============================================================================

  // Note: Webhook endpoints (inbound, status, speech) don't require company validation
  // as they are called by Twilio and use CallSid for lookup
  @Post('voice/inbound')
  async handleInboundCall(
    @Body() webhookData: TwilioInboundWebhookDto,
    @Res() res: Response,
  ) {
    const twiml = await this.voiceAIService.handleInboundCall(webhookData);
    res.type('text/xml');
    res.send(twiml);
  }

  @Post('voice/outbound')
  @UseGuards(JwtAuthGuard)
  async initiateOutboundCall(
    @Body() dto: InitiateOutboundCallDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.voiceAIService.initiateOutboundCall(
      companyId,
      dto.customerId,
      dto.scriptId,
      dto.priority,
    );
  }

  @Post('voice/status')
  async handleCallStatus(@Body() webhookData: TwilioStatusCallbackDto) {
    await this.voiceAIService.handleCallStatusUpdate(webhookData);
    return { received: true };
  }

  @Post('voice/speech')
  async handleSpeechResult(
    @Body() body: { CallSid: string; SpeechResult: string; Confidence: number },
    @Res() res: Response,
  ) {
    const twiml = await this.voiceAIService.processSpeechResult(
      body.CallSid,
      body.SpeechResult,
      body.Confidence,
    );
    res.type('text/xml');
    res.send(twiml);
  }

  @Get('voice/calls/:companyId')
  @UseGuards(JwtAuthGuard)
  async getVoiceCalls(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('status') status: string,
    @Query('outcome') outcome: string,
    @Query('direction') direction: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.voiceAIService.getCalls(companyId, {
      status: status as any,
      outcome: outcome as any,
      direction: direction as any,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('voice/call/:callId')
  @UseGuards(JwtAuthGuard)
  async getVoiceCallById(
    @Param('callId') callId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.voiceAIService.getCallById(callId);
  }

  @Get('voice/scripts/:companyId')
  @UseGuards(JwtAuthGuard)
  async getVoiceScripts(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('type') type: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.voiceAIService.getScripts(companyId, type as any);
  }

  @Post('voice/scripts')
  @UseGuards(JwtAuthGuard)
  async createVoiceScript(
    @Body() dto: CreateVoiceScriptDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.voiceAIService.createScript(companyId, dto);
  }

  @Put('voice/scripts/:scriptId')
  @UseGuards(JwtAuthGuard)
  async updateVoiceScript(
    @Param('scriptId') scriptId: string,
    @Body() dto: UpdateVoiceScriptDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.voiceAIService.updateScript(scriptId, dto);
  }

  // =============================================================================
  // CONTENT GENERATION ENDPOINTS
  // =============================================================================

  @Post('content/generate')
  @UseGuards(JwtAuthGuard)
  async generateContent(
    @Body() dto: GenerateContentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || (dto as any).companyId);
    return this.contentGenerationService.generateContent({ ...dto, companyId } as any);
  }

  @Get('content/:companyId')
  @UseGuards(JwtAuthGuard)
  async getContent(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('type') type: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.contentGenerationService.getContent(companyId, {
      type: type as any,
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('content/item/:contentId')
  @UseGuards(JwtAuthGuard)
  async getContentById(
    @Param('contentId') contentId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentGenerationService.getContentById(contentId);
  }

  @Put('content/:contentId/approve')
  @UseGuards(JwtAuthGuard)
  async approveContent(
    @Param('contentId') contentId: string,
    @Body() dto: ApproveContentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentGenerationService.approveContent(contentId, dto.approvedBy);
  }

  @Post('content/:contentId/variant')
  @UseGuards(JwtAuthGuard)
  async generateContentVariant(
    @Param('contentId') contentId: string,
    @Body() body: { modifications?: any },
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentGenerationService.generateVariant(contentId, body.modifications);
  }

  @Get('triggers')
  @UseGuards(JwtAuthGuard)
  async getBehavioralTriggers(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentGenerationService.getAllTriggers();
  }

  @Get('triggers/:category')
  @UseGuards(JwtAuthGuard)
  async getTriggersByCategory(
    @Param('category') category: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.contentGenerationService.getTriggersByCategory(category);
  }

  // =============================================================================
  // UPSELL ENDPOINTS
  // =============================================================================

  @Post('upsell/recommend')
  @UseGuards(JwtAuthGuard)
  async getUpsellRecommendations(
    @Body() dto: GetUpsellRecommendationDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.upsellService.getRecommendations(
      companyId,
      dto.customerId,
      dto.moment,
    );
  }

  @Post('upsell/present')
  @UseGuards(JwtAuthGuard)
  async recordOfferPresentation(
    @Body() dto: RecordOfferPresentationDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.upsellService.recordPresentation(dto.offerId);
  }

  @Post('upsell/accept')
  @UseGuards(JwtAuthGuard)
  async recordOfferAcceptance(
    @Body() dto: RecordOfferAcceptanceDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.upsellService.recordAcceptance(dto.offerId, dto.revenue);
  }

  @Get('upsell/performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getUpsellPerformance(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('moment') moment: string,
    @Query('dateRange') dateRange: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.upsellService.getPerformanceMetrics(companyId, {
      moment: moment as any,
      dateRange,
    });
  }

  // =============================================================================
  // ANALYTICS ENDPOINTS
  // =============================================================================

  @Get('analytics/overview/:companyId')
  @UseGuards(JwtAuthGuard)
  async getAnalyticsOverview(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('dateRange') dateRange: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.analyticsService.getOverview(companyId, { dateRange });
  }

  @Get('analytics/save-performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getSavePerformance(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('dateRange') dateRange: string,
    @Query('groupBy') groupBy: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.analyticsService.getSavePerformance(companyId, { dateRange, groupBy });
  }

  @Get('analytics/voice-performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getVoicePerformance(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('dateRange') dateRange: string,
    @Query('direction') direction: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.analyticsService.getVoicePerformance(companyId, { dateRange, direction });
  }

  @Get('analytics/content-performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getContentPerformance(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('dateRange') dateRange: string,
    @Query('type') type: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.analyticsService.getContentPerformance(companyId, {
      dateRange,
      type: type as any,
    });
  }

  @Get('analytics/attribution/:companyId')
  @UseGuards(JwtAuthGuard)
  async getRevenueAttribution(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('dateRange') dateRange: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.analyticsService.getRevenueAttribution(companyId, { dateRange });
  }
}
