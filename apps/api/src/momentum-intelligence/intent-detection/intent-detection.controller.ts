import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EnhancedIntentDetectionService } from './enhanced-intent-detection.service';
import { ChurnPredictorService } from './churn-predictor.service';
import {
  DetectIntentDto,
  RecordSignalDto,
  GetRiskScoreDto,
  RiskLevel,
  IntentDetectionResult,
  ChurnRiskScore,
  CustomerEngagementMetrics,
  IntentCategory,
  ChurnSignalType,
} from './types/intent.types';

@Controller('momentum/intent')
@UseGuards(JwtAuthGuard)
export class IntentDetectionController {
  constructor(
    private readonly intentService: EnhancedIntentDetectionService,
    private readonly churnPredictor: ChurnPredictorService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // INTENT DETECTION
  // ═══════════════════════════════════════════════════════════════

  @Post('detect')
  async detectIntent(
    @Body() dto: DetectIntentDto,
  ): Promise<IntentDetectionResult> {
    return this.intentService.detectIntent(dto);
  }

  @Get('detections/:companyId')
  async getRecentDetections(
    @Param('companyId') companyId: string,
    @Query('customerId') customerId?: string,
    @Query('intent') intent?: string,
    @Query('limit') limit?: string,
  ): Promise<IntentDetectionResult[]> {
    return this.intentService.getRecentDetections(companyId, {
      customerId,
      intent: intent as IntentCategory,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats/:companyId')
  async getIntentStats(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    return this.intentService.getIntentStats(companyId, dateRange);
  }

  // ═══════════════════════════════════════════════════════════════
  // CHURN SIGNALS
  // ═══════════════════════════════════════════════════════════════

  @Post('signals')
  async recordSignal(@Body() dto: RecordSignalDto) {
    return this.churnPredictor.recordSignal(dto);
  }

  @Post('signals/batch')
  async recordSignalsBatch(@Body() signals: RecordSignalDto[]) {
    const results = await Promise.all(
      signals.map((signal) => this.churnPredictor.recordSignal(signal)),
    );
    return {
      recorded: results.length,
      signals: results,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RISK SCORES
  // ═══════════════════════════════════════════════════════════════

  @Get('risk/:customerId')
  async getRiskScore(
    @Param('customerId') customerId: string,
    @Query('companyId') companyId: string,
    @Query('includeSignals') includeSignals?: string,
    @Query('includeRecommendations') includeRecommendations?: string,
  ): Promise<ChurnRiskScore | null> {
    return this.churnPredictor.getCustomerRiskScore({
      customerId,
      companyId,
      includeSignals: includeSignals === 'true',
      includeRecommendations: includeRecommendations !== 'false',
    });
  }

  @Post('risk/calculate')
  async calculateRiskScore(
    @Body() dto: GetRiskScoreDto,
  ): Promise<ChurnRiskScore> {
    return this.churnPredictor.calculateRiskScore(dto);
  }

  @Get('risk/high-risk/:companyId')
  async getHighRiskCustomers(
    @Param('companyId') companyId: string,
    @Query('minRiskLevel') minRiskLevel?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ChurnRiskScore[]> {
    return this.churnPredictor.getHighRiskCustomers({
      companyId,
      minRiskLevel: minRiskLevel as RiskLevel,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ENGAGEMENT METRICS
  // ═══════════════════════════════════════════════════════════════

  @Get('engagement/:customerId')
  async getEngagementMetrics(
    @Param('customerId') customerId: string,
    @Query('companyId') companyId: string,
  ): Promise<CustomerEngagementMetrics> {
    return this.churnPredictor.calculateEngagementMetrics(customerId, companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('signal-types')
  getSignalTypes() {
    return Object.values(ChurnSignalType);
  }

  @Get('intent-categories')
  getIntentCategories() {
    return Object.values(IntentCategory);
  }

  @Get('risk-levels')
  getRiskLevels() {
    return Object.values(RiskLevel);
  }
}
