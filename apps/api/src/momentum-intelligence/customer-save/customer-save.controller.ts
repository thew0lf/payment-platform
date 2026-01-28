import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { CustomerSaveService } from './customer-save.service';
import { SaveOutcome } from '../types/momentum.types';

// DTO Types
interface InitiateSaveFlowDto {
  companyId: string;
  customerId: string;
  trigger: string;
}

interface ProgressStageDto {
  response?: any;
  selectedOption?: string;
}

interface CompleteSaveFlowDto {
  outcome: SaveOutcome;
  details?: any;
}

interface UpdateFlowConfigDto {
  enabled?: boolean;
  patternInterrupt?: any;
  diagnosisSurvey?: any;
  branchingInterventions?: any;
  nuclearOffer?: any;
  lossVisualization?: any;
  exitSurvey?: any;
  winback?: any;
  voiceAIEnabled?: boolean;
  voiceAIConfig?: any;
}

@Controller('momentum/save')
@UseGuards(JwtAuthGuard)
export class CustomerSaveController {
  constructor(
    private readonly saveService: CustomerSaveService,
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
  // SAVE FLOW OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initiate a new save flow for a customer
   */
  @Post('initiate')
  async initiateSaveFlow(
    @Body() dto: InitiateSaveFlowDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.saveService.initiateSaveFlow(
      companyId,
      dto.customerId,
      dto.trigger,
    );
  }

  /**
   * Progress to the next stage in a save flow
   */
  @Post('progress/:attemptId')
  async progressToNextStage(
    @Param('attemptId') attemptId: string,
    @Body() dto: ProgressStageDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.saveService.progressToNextStage(
      attemptId,
      dto.response,
      dto.selectedOption,
    );
  }

  /**
   * Complete a save flow with final outcome
   */
  @Post('complete/:attemptId')
  async completeSaveFlow(
    @Param('attemptId') attemptId: string,
    @Body() dto: CompleteSaveFlowDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.saveService.completeSaveFlow(
      attemptId,
      dto.outcome,
      dto.details,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SAVE ATTEMPT QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a specific save attempt by ID
   */
  @Get('attempt/:attemptId')
  async getSaveAttempt(
    @Param('attemptId') attemptId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);

    const attempt = await this.saveService['prisma'].saveAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException(`Save attempt ${attemptId} not found`);
    }

    return attempt;
  }

  /**
   * Get active save attempt for a customer
   */
  @Get('active/:companyId/:customerId')
  async getActiveSaveAttempt(
    @Param('companyId') paramCompanyId: string,
    @Param('customerId') customerId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    const attempt = await this.saveService['prisma'].saveAttempt.findFirst({
      where: {
        companyId,
        customerId,
        outcome: null,
        completedAt: null,
      },
    });

    return attempt;
  }

  /**
   * Get save attempts with query params (used by frontend)
   * Transforms currentStage from number to stage name string
   */
  @Get('attempts')
  async getAttemptsByQuery(
    @Query('companyId') queryCompanyId: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId);

    const where: any = { companyId };

    // Handle status filter (IN_PROGRESS means no outcome yet)
    if (status === 'IN_PROGRESS') {
      where.outcome = null;
      where.completedAt = null;
    }

    const [items, total] = await Promise.all([
      this.saveService['prisma'].saveAttempt.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit, 10) : 50,
        skip: offset ? parseInt(offset, 10) : 0,
      }),
      this.saveService['prisma'].saveAttempt.count({ where }),
    ]);

    // Transform currentStage from number to stage name
    const stageNumberToName: Record<number, string> = {
      1: 'PATTERN_INTERRUPT',
      2: 'DIAGNOSIS',
      3: 'BRANCHING',
      4: 'NUCLEAR_OFFER',
      5: 'LOSS_VISUALIZATION',
      6: 'EXIT_SURVEY',
      7: 'WINBACK',
    };

    const transformedItems = items.map((item: any) => ({
      ...item,
      currentStage: stageNumberToName[item.currentStage] || 'PATTERN_INTERRUPT',
      startedAt: item.createdAt,
      offersMade: item.offersMade || [],
      offersAccepted: item.offersAccepted || [],
    }));

    return { items: transformedItems, total };
  }

  /**
   * Get save attempts for a company (legacy route)
   */
  @Get('attempts/:companyId')
  async getSaveAttempts(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('customerId') customerId: string,
    @Query('outcome') outcome: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    const where: any = { companyId };

    if (customerId) {
      where.customerId = customerId;
    }

    if (outcome) {
      where.outcome = outcome as SaveOutcome;
    }

    const attempts = await this.saveService['prisma'].saveAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    return attempts;
  }

  /**
   * Get save flow stats for a company (matches frontend API)
   */
  @Get('stats/:companyId')
  async getStats(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    // Get all save attempts for this company
    const attempts = await this.saveService['prisma'].saveAttempt.findMany({
      where: { companyId },
    });

    const totalAttempts = attempts.length;
    const inProgress = attempts.filter(a => a.outcome === null && a.completedAt === null).length;
    const completed = attempts.filter(a => a.outcome !== null);
    const saved = completed.filter(a => a.outcome && a.outcome.toString().startsWith('SAVED')).length;
    const cancelled = completed.filter(a => a.outcome === 'CANCELLED').length;
    const paused = completed.filter(a => a.outcome === 'PAUSED').length;
    const downgraded = completed.filter(a => a.outcome === 'DOWNGRADED').length;

    // Calculate success rate
    const successRate = totalAttempts > 0 ? (saved / totalAttempts) * 100 : 0;

    // Calculate average time to save (in minutes)
    const savedAttempts = completed.filter(a =>
      a.outcome && a.outcome.toString().startsWith('SAVED') && a.completedAt
    );
    let avgTimeToSave = 0;
    if (savedAttempts.length > 0) {
      const totalTime = savedAttempts.reduce((sum, a) => {
        const duration = new Date(a.completedAt!).getTime() - new Date(a.createdAt).getTime();
        return sum + duration;
      }, 0);
      avgTimeToSave = (totalTime / savedAttempts.length) / 60000; // Convert to minutes
    }

    // Calculate revenue preserved
    const revenuePreserved = completed.reduce((sum, a) => {
      return sum + (a.revenuePreserved ? Number(a.revenuePreserved) : 0);
    }, 0);

    // Stage performance
    const stageSaves: Record<string, { stage: string; attempts: number; saves: number }> = {};
    const stageNames = ['PATTERN_INTERRUPT', 'DIAGNOSIS', 'BRANCHING', 'NUCLEAR_OFFER', 'LOSS_VISUALIZATION', 'EXIT_SURVEY', 'WINBACK'];

    for (const stageName of stageNames) {
      stageSaves[stageName] = { stage: stageName, attempts: 0, saves: 0 };
    }

    for (const attempt of completed) {
      const outcome = attempt.outcome as string;
      if (outcome?.startsWith('SAVED_STAGE_')) {
        const stageNum = parseInt(outcome.replace('SAVED_STAGE_', ''), 10);
        const stageName = stageNames[stageNum - 1];
        if (stageName && stageSaves[stageName]) {
          stageSaves[stageName].saves++;
        }
      }
    }

    const stagePerformance = Object.values(stageSaves).map(s => ({
      stage: s.stage,
      attempts: s.attempts,
      saves: s.saves,
      rate: totalAttempts > 0 ? Math.round((s.saves / Math.max(totalAttempts, 1)) * 100) : 0,
    }));

    return {
      totalAttempts,
      inProgress,
      saved,
      cancelled,
      paused,
      downgraded,
      successRate: Math.round(successRate * 100) / 100,
      avgTimeToSave: Math.round(avgTimeToSave * 10) / 10,
      stagePerformance,
      revenuePreserved,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FLOW CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get save flow configuration for a company
   * Transforms internal config format to match frontend SaveFlowConfig type
   */
  @Get('config/:companyId')
  async getFlowConfig(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    const config = await this.saveService.getFlowConfig(companyId);

    // Transform to frontend expected format
    const stageMapping: { key: string; stage: string }[] = [
      { key: 'patternInterrupt', stage: 'PATTERN_INTERRUPT' },
      { key: 'diagnosisSurvey', stage: 'DIAGNOSIS' },
      { key: 'branchingInterventions', stage: 'BRANCHING' },
      { key: 'nuclearOffer', stage: 'NUCLEAR_OFFER' },
      { key: 'lossVisualization', stage: 'LOSS_VISUALIZATION' },
      { key: 'exitSurvey', stage: 'EXIT_SURVEY' },
      { key: 'winback', stage: 'WINBACK' },
    ];

    const stages = stageMapping.map(({ key, stage }) => {
      const stageConfig = config[key] || {};
      return {
        stage,
        enabled: stageConfig.enabled ?? false,
        template: stageConfig.template,
        retryCount: stageConfig.retryCount ?? 0,
        delayMinutes: stageConfig.delayMinutes ?? 0,
      };
    });

    return {
      id: config.id || '',
      companyId: config.companyId || companyId,
      isEnabled: config.enabled ?? false,
      stages,
      defaultOffers: config.defaultOffers || [],
      escalationThreshold: config.escalationThreshold || 0,
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: config.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Update save flow configuration for a company
   * Transforms frontend format to internal config format
   */
  @Put('config/:companyId')
  async updateFlowConfig(
    @Param('companyId') paramCompanyId: string,
    @Body() dto: UpdateFlowConfigDto & { isEnabled?: boolean; stages?: any[] },
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    // Transform frontend format to internal format
    const updates: any = { ...dto };

    // Handle isEnabled -> enabled
    if ('isEnabled' in dto) {
      updates.enabled = dto.isEnabled;
      delete updates.isEnabled;
    }

    // Handle stages array -> individual stage configs
    if (dto.stages && Array.isArray(dto.stages)) {
      const stageKeyMapping: Record<string, string> = {
        'PATTERN_INTERRUPT': 'patternInterrupt',
        'DIAGNOSIS': 'diagnosisSurvey',
        'BRANCHING': 'branchingInterventions',
        'NUCLEAR_OFFER': 'nuclearOffer',
        'LOSS_VISUALIZATION': 'lossVisualization',
        'EXIT_SURVEY': 'exitSurvey',
        'WINBACK': 'winback',
      };

      for (const stageUpdate of dto.stages) {
        const key = stageKeyMapping[stageUpdate.stage];
        if (key) {
          // Get existing config and merge
          const existingConfig = await this.saveService.getFlowConfig(companyId);
          updates[key] = {
            ...existingConfig[key],
            enabled: stageUpdate.enabled,
            retryCount: stageUpdate.retryCount,
            delayMinutes: stageUpdate.delayMinutes,
          };
        }
      }
      delete updates.stages;
    }

    await this.saveService.updateFlowConfig(companyId, updates);

    // Return in frontend format - pass user context for recursive call
    return this.getFlowConfig(paramCompanyId, queryCompanyId, user);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS & REPORTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get save flow analytics for a company
   */
  @Get('analytics/:companyId')
  async getSaveAnalytics(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all save attempts in the period
    const attempts = await this.saveService['prisma'].saveAttempt.findMany({
      where: {
        companyId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Calculate metrics
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.outcome !== null);
    const savedAttempts = completedAttempts.filter(a =>
      a.outcome && a.outcome.toString().startsWith('SAVED')
    );

    const outcomeDistribution: Record<string, number> = {};
    const stageSaves: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const reasonDistribution: Record<string, number> = {};
    let totalRevenuePreserved = 0;

    for (const attempt of completedAttempts) {
      const outcome = attempt.outcome as string;
      outcomeDistribution[outcome] = (outcomeDistribution[outcome] || 0) + 1;

      if (outcome.startsWith('SAVED_STAGE_')) {
        const stageNum = parseInt(outcome.replace('SAVED_STAGE_', ''), 10);
        if (stageSaves[stageNum] !== undefined) {
          stageSaves[stageNum]++;
        }
      }

      if (attempt.reasonCategory) {
        reasonDistribution[attempt.reasonCategory] =
          (reasonDistribution[attempt.reasonCategory] || 0) + 1;
      }

      if (attempt.revenuePreserved) {
        totalRevenuePreserved += Number(attempt.revenuePreserved);
      }
    }

    const saveRate = totalAttempts > 0
      ? (savedAttempts.length / totalAttempts) * 100
      : 0;

    // Stage performance
    const stagePerformance = Object.entries(stageSaves).map(([stage, saves]) => ({
      stage: parseInt(stage, 10),
      stageName: this.getStageNameByNumber(parseInt(stage, 10)),
      saves,
      percentage: savedAttempts.length > 0
        ? (saves / savedAttempts.length) * 100
        : 0,
    }));

    return {
      period: { start, end },
      totalAttempts,
      completedAttempts: completedAttempts.length,
      savedAttempts: savedAttempts.length,
      saveRate: Math.round(saveRate * 100) / 100,
      totalRevenuePreserved,
      outcomeDistribution,
      stagePerformance,
      reasonDistribution,
    };
  }

  /**
   * Get stage performance breakdown
   */
  @Get('analytics/:companyId/stages')
  async getStageAnalytics(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const attempts = await this.saveService['prisma'].saveAttempt.findMany({
      where: {
        companyId,
        completedAt: { not: null },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Analyze stage progression
    const stageStats: Record<number, {
      entered: number;
      exited: number;
      saved: number;
      avgTimeSpentMs: number;
    }> = {};

    for (let i = 1; i <= 7; i++) {
      stageStats[i] = { entered: 0, exited: 0, saved: 0, avgTimeSpentMs: 0 };
    }

    for (const attempt of attempts) {
      const history = attempt.stageHistory as any[];
      if (!history) continue;

      for (const entry of history) {
        const stage = entry.stage;
        if (!stageStats[stage]) continue;

        stageStats[stage].entered++;

        if (entry.exitedAt) {
          stageStats[stage].exited++;
          const timeSpent = new Date(entry.exitedAt).getTime() - new Date(entry.enteredAt).getTime();
          stageStats[stage].avgTimeSpentMs += timeSpent;
        }
      }

      // Check where they were saved
      const outcome = attempt.outcome as string;
      if (outcome?.startsWith('SAVED_STAGE_')) {
        const savedStage = parseInt(outcome.replace('SAVED_STAGE_', ''), 10);
        if (stageStats[savedStage]) {
          stageStats[savedStage].saved++;
        }
      }
    }

    // Calculate averages
    const stageAnalytics = Object.entries(stageStats).map(([stage, stats]) => {
      const avgTime = stats.exited > 0
        ? stats.avgTimeSpentMs / stats.exited
        : 0;

      return {
        stage: parseInt(stage, 10),
        stageName: this.getStageNameByNumber(parseInt(stage, 10)),
        entered: stats.entered,
        exited: stats.exited,
        saved: stats.saved,
        saveRate: stats.entered > 0
          ? Math.round((stats.saved / stats.entered) * 10000) / 100
          : 0,
        avgTimeSpentSeconds: Math.round(avgTime / 1000),
        dropoffRate: stats.entered > 0
          ? Math.round(((stats.entered - stats.exited - stats.saved) / stats.entered) * 10000) / 100
          : 0,
      };
    });

    return {
      period: { start, end },
      totalAttempts: attempts.length,
      stageAnalytics,
    };
  }

  /**
   * Get reason/branch analytics
   */
  @Get('analytics/:companyId/reasons')
  async getReasonAnalytics(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const attempts = await this.saveService['prisma'].saveAttempt.findMany({
      where: {
        companyId,
        reasonCategory: { not: null },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const reasonStats: Record<string, {
      total: number;
      saved: number;
      cancelled: number;
      revenuePreserved: number;
    }> = {};

    for (const attempt of attempts) {
      const reason = attempt.reasonCategory as string;
      if (!reasonStats[reason]) {
        reasonStats[reason] = { total: 0, saved: 0, cancelled: 0, revenuePreserved: 0 };
      }

      reasonStats[reason].total++;

      const outcome = attempt.outcome as string;
      if (outcome?.startsWith('SAVED')) {
        reasonStats[reason].saved++;
        if (attempt.revenuePreserved) {
          reasonStats[reason].revenuePreserved += Number(attempt.revenuePreserved);
        }
      } else if (outcome === 'CANCELLED') {
        reasonStats[reason].cancelled++;
      }
    }

    const reasonAnalytics = Object.entries(reasonStats).map(([reason, stats]) => ({
      reason,
      reasonLabel: this.getReasonLabel(reason),
      total: stats.total,
      saved: stats.saved,
      cancelled: stats.cancelled,
      saveRate: stats.total > 0
        ? Math.round((stats.saved / stats.total) * 10000) / 100
        : 0,
      revenuePreserved: stats.revenuePreserved,
    })).sort((a, b) => b.total - a.total);

    return {
      period: { start, end },
      totalWithReason: attempts.length,
      reasonAnalytics,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all save flow stages
   */
  @Get('stages')
  getStages(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // These are static lookups but still require valid auth
    return [
      { stage: 1, name: 'pattern_interrupt', displayName: 'Pattern Interrupt' },
      { stage: 2, name: 'diagnosis_survey', displayName: 'Diagnosis Survey' },
      { stage: 3, name: 'branching_interventions', displayName: 'Branching Interventions' },
      { stage: 4, name: 'nuclear_offer', displayName: 'Nuclear Offer' },
      { stage: 5, name: 'loss_visualization', displayName: 'Loss Visualization' },
      { stage: 6, name: 'exit_survey', displayName: 'Exit Survey' },
      { stage: 7, name: 'winback', displayName: 'Winback' },
    ];
  }

  /**
   * Get all save outcomes
   */
  @Get('outcomes')
  getOutcomes(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return Object.values(SaveOutcome);
  }

  /**
   * Get cancellation reason categories
   */
  @Get('reason-categories')
  getReasonCategories(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return [
      { id: 'too_expensive', label: "It's too expensive", branch: 'tooExpensive' },
      { id: 'wrong_product', label: "It's not what I expected", branch: 'wrongProduct' },
      { id: 'too_much', label: 'I have too much', branch: 'tooMuch' },
      { id: 'shipping_issues', label: 'Shipping problems', branch: 'shippingIssues' },
      { id: 'not_using', label: "I'm not using it", branch: 'notUsing' },
      { id: 'other', label: 'Other reason', branch: 'other' },
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private getStageNameByNumber(stage: number): string {
    const stageNames: Record<number, string> = {
      1: 'Pattern Interrupt',
      2: 'Diagnosis Survey',
      3: 'Branching Interventions',
      4: 'Nuclear Offer',
      5: 'Loss Visualization',
      6: 'Exit Survey',
      7: 'Winback',
    };
    return stageNames[stage] || `Stage ${stage}`;
  }

  private getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      too_expensive: "It's too expensive",
      wrong_product: "It's not what I expected",
      too_much: 'I have too much',
      shipping_issues: 'Shipping problems',
      not_using: "I'm not using it",
      other: 'Other reason',
    };
    return labels[reason] || reason;
  }
}
