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
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
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

  // ═══════════════════════════════════════════════════════════════
  // INTENT DETECTION
  // ═══════════════════════════════════════════════════════════════

  @Post('detect')
  async detectIntent(
    @Body() dto: DetectIntentDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntentDetectionResult> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.intentService.detectIntent({ ...dto, companyId });
  }

  @Get('detections/:companyId')
  async getRecentDetections(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('customerId') customerId: string,
    @Query('intent') intent: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntentDetectionResult[]> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.intentService.getRecentDetections(companyId, {
      customerId,
      intent: intent as IntentCategory,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats/:companyId')
  async getIntentStats(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
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
  async recordSignal(
    @Body() dto: RecordSignalDto & { companyId?: string },
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    // recordSignal expects companyId - create extended object
    return this.churnPredictor.recordSignal({ ...dto, companyId } as any);
  }

  @Post('signals/batch')
  async recordSignalsBatch(
    @Body() signals: (RecordSignalDto & { companyId?: string })[],
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate access first - use the first signal's companyId or query param
    const firstCompanyId = signals[0]?.companyId;
    const companyId = await this.getCompanyId(user, queryCompanyId || firstCompanyId);

    // Override all signals with validated companyId
    const results = await Promise.all(
      signals.map((signal) => this.churnPredictor.recordSignal({ ...signal, companyId } as any)),
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
    @Query('companyId') queryCompanyId: string,
    @Query('includeSignals') includeSignals: string,
    @Query('includeRecommendations') includeRecommendations: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChurnRiskScore | null> {
    const companyId = await this.getCompanyId(user, queryCompanyId);
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
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChurnRiskScore> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.churnPredictor.calculateRiskScore({ ...dto, companyId });
  }

  @Get('risk/high-risk/:companyId')
  async getHighRiskCustomers(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('minRiskLevel') minRiskLevel: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChurnRiskScore[]> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
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
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerEngagementMetrics> {
    const companyId = await this.getCompanyId(user, queryCompanyId);
    return this.churnPredictor.calculateEngagementMetrics(customerId, companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Get('signal-types')
  getSignalTypes(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // These are static lookups but still require valid auth
    return Object.values(ChurnSignalType);
  }

  @Get('intent-categories')
  getIntentCategories(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return Object.values(IntentCategory);
  }

  @Get('risk-levels')
  getRiskLevels(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return Object.values(RiskLevel);
  }
}
