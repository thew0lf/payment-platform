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
} from '@nestjs/common';
import { Response } from 'express';
import { IntentDetectionService } from './intent-detection/intent-detection.service';
import { CustomerSaveService } from './customer-save/customer-save.service';
import { VoiceAIService } from './voice-ai/voice-ai.service';
import { ContentGenerationService } from './content-generation/content-generation.service';
import { UpsellService } from './upsell/upsell.service';
import { AnalyticsService } from './analytics/analytics.service';
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
  ) {}

  // =============================================================================
  // INTENT DETECTION ENDPOINTS
  // =============================================================================

  @Post('intent/calculate')
  @UseGuards(JwtAuthGuard)
  async calculateChurnRisk(@Body() dto: CalculateChurnRiskDto) {
    return this.intentDetectionService.calculateChurnRisk(dto.companyId, dto.customerId);
  }

  @Post('intent/batch')
  @UseGuards(JwtAuthGuard)
  async batchCalculateChurnRisk(@Body() dto: BatchCalculateChurnRiskDto) {
    const results = await this.intentDetectionService.batchCalculateChurnRisk(
      dto.companyId,
      dto.customerIds,
    );
    return Object.fromEntries(results);
  }

  @Get('intent/:companyId/:customerId')
  @UseGuards(JwtAuthGuard)
  async getCustomerIntent(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.intentDetectionService.getCustomerIntent(companyId, customerId);
  }

  @Get('intent/high-risk/:companyId')
  @UseGuards(JwtAuthGuard)
  async getHighRiskCustomers(
    @Param('companyId') companyId: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('urgency') urgency?: string,
    @Query('limit') limit?: string,
    @Query('minScore') minScore?: string,
  ) {
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
  async initiateSaveFlow(@Body() dto: InitiateSaveFlowDto) {
    return this.customerSaveService.initiateSaveFlow(
      dto.companyId,
      dto.customerId,
      dto.trigger,
    );
  }

  @Post('save/:attemptId/stage')
  @UseGuards(JwtAuthGuard)
  async progressSaveStage(
    @Param('attemptId') attemptId: string,
    @Body() dto: ProgressSaveStageDto,
  ) {
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
  ) {
    return this.customerSaveService.completeSaveFlow(attemptId, dto.outcome as any, dto.details);
  }

  @Get('save/config/:companyId')
  @UseGuards(JwtAuthGuard)
  async getSaveFlowConfig(@Param('companyId') companyId: string) {
    return this.customerSaveService.getFlowConfig(companyId);
  }

  @Put('save/config/:companyId')
  @UseGuards(JwtAuthGuard)
  async updateSaveFlowConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateSaveFlowConfigDto,
  ) {
    return this.customerSaveService.updateFlowConfig(companyId, dto);
  }

  // =============================================================================
  // VOICE AI ENDPOINTS
  // =============================================================================

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
  async initiateOutboundCall(@Body() dto: InitiateOutboundCallDto) {
    return this.voiceAIService.initiateOutboundCall(
      dto.companyId,
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
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('outcome') outcome?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
  ) {
    return this.voiceAIService.getCalls(companyId, {
      status: status as any,
      outcome: outcome as any,
      direction: direction as any,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('voice/call/:callId')
  @UseGuards(JwtAuthGuard)
  async getVoiceCallById(@Param('callId') callId: string) {
    return this.voiceAIService.getCallById(callId);
  }

  @Get('voice/scripts/:companyId')
  @UseGuards(JwtAuthGuard)
  async getVoiceScripts(
    @Param('companyId') companyId: string,
    @Query('type') type?: string,
  ) {
    return this.voiceAIService.getScripts(companyId, type as any);
  }

  @Post('voice/scripts')
  @UseGuards(JwtAuthGuard)
  async createVoiceScript(@Body() dto: CreateVoiceScriptDto) {
    return this.voiceAIService.createScript(dto.companyId, dto);
  }

  @Put('voice/scripts/:scriptId')
  @UseGuards(JwtAuthGuard)
  async updateVoiceScript(
    @Param('scriptId') scriptId: string,
    @Body() dto: UpdateVoiceScriptDto,
  ) {
    return this.voiceAIService.updateScript(scriptId, dto);
  }

  // =============================================================================
  // CONTENT GENERATION ENDPOINTS
  // =============================================================================

  @Post('content/generate')
  @UseGuards(JwtAuthGuard)
  async generateContent(@Body() dto: GenerateContentDto) {
    return this.contentGenerationService.generateContent(dto as any);
  }

  @Get('content/:companyId')
  @UseGuards(JwtAuthGuard)
  async getContent(
    @Param('companyId') companyId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentGenerationService.getContent(companyId, {
      type: type as any,
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('content/item/:contentId')
  @UseGuards(JwtAuthGuard)
  async getContentById(@Param('contentId') contentId: string) {
    return this.contentGenerationService.getContentById(contentId);
  }

  @Put('content/:contentId/approve')
  @UseGuards(JwtAuthGuard)
  async approveContent(
    @Param('contentId') contentId: string,
    @Body() dto: ApproveContentDto,
  ) {
    return this.contentGenerationService.approveContent(contentId, dto.approvedBy);
  }

  @Post('content/:contentId/variant')
  @UseGuards(JwtAuthGuard)
  async generateContentVariant(
    @Param('contentId') contentId: string,
    @Body() body: { modifications?: any },
  ) {
    return this.contentGenerationService.generateVariant(contentId, body.modifications);
  }

  @Get('triggers')
  @UseGuards(JwtAuthGuard)
  async getBehavioralTriggers() {
    return this.contentGenerationService.getAllTriggers();
  }

  @Get('triggers/:category')
  @UseGuards(JwtAuthGuard)
  async getTriggersByCategory(@Param('category') category: string) {
    return this.contentGenerationService.getTriggersByCategory(category);
  }

  // =============================================================================
  // UPSELL ENDPOINTS
  // =============================================================================

  @Post('upsell/recommend')
  @UseGuards(JwtAuthGuard)
  async getUpsellRecommendations(@Body() dto: GetUpsellRecommendationDto) {
    return this.upsellService.getRecommendations(
      dto.companyId,
      dto.customerId,
      dto.moment,
    );
  }

  @Post('upsell/present')
  @UseGuards(JwtAuthGuard)
  async recordOfferPresentation(@Body() dto: RecordOfferPresentationDto) {
    return this.upsellService.recordPresentation(dto.offerId);
  }

  @Post('upsell/accept')
  @UseGuards(JwtAuthGuard)
  async recordOfferAcceptance(@Body() dto: RecordOfferAcceptanceDto) {
    return this.upsellService.recordAcceptance(dto.offerId, dto.revenue);
  }

  @Get('upsell/performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getUpsellPerformance(
    @Param('companyId') companyId: string,
    @Query('moment') moment?: string,
    @Query('dateRange') dateRange?: string,
  ) {
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
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
  ) {
    return this.analyticsService.getOverview(companyId, { dateRange });
  }

  @Get('analytics/save-performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getSavePerformance(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.analyticsService.getSavePerformance(companyId, { dateRange, groupBy });
  }

  @Get('analytics/voice-performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getVoicePerformance(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('direction') direction?: string,
  ) {
    return this.analyticsService.getVoicePerformance(companyId, { dateRange, direction });
  }

  @Get('analytics/content-performance/:companyId')
  @UseGuards(JwtAuthGuard)
  async getContentPerformance(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('type') type?: string,
  ) {
    return this.analyticsService.getContentPerformance(companyId, {
      dateRange,
      type: type as any,
    });
  }

  @Get('analytics/attribution/:companyId')
  @UseGuards(JwtAuthGuard)
  async getRevenueAttribution(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
  ) {
    return this.analyticsService.getRevenueAttribution(companyId, { dateRange });
  }
}
