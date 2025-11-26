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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  constructor(private readonly saveService: CustomerSaveService) {}

  // ═══════════════════════════════════════════════════════════════
  // SAVE FLOW OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initiate a new save flow for a customer
   */
  @Post('initiate')
  async initiateSaveFlow(@Body() dto: InitiateSaveFlowDto) {
    return this.saveService.initiateSaveFlow(
      dto.companyId,
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
  ) {
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
  ) {
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
  async getSaveAttempt(@Param('attemptId') attemptId: string) {
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
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
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
   * Get save attempts for a company
   */
  @Get('attempts/:companyId')
  async getSaveAttempts(
    @Param('companyId') companyId: string,
    @Query('customerId') customerId?: string,
    @Query('outcome') outcome?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
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

  // ═══════════════════════════════════════════════════════════════
  // FLOW CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get save flow configuration for a company
   */
  @Get('config/:companyId')
  async getFlowConfig(@Param('companyId') companyId: string) {
    return this.saveService.getFlowConfig(companyId);
  }

  /**
   * Update save flow configuration for a company
   */
  @Put('config/:companyId')
  async updateFlowConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateFlowConfigDto,
  ) {
    return this.saveService.updateFlowConfig(companyId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS & REPORTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get save flow analytics for a company
   */
  @Get('analytics/:companyId')
  async getSaveAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
  getStages() {
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
  getOutcomes() {
    return Object.values(SaveOutcome);
  }

  /**
   * Get cancellation reason categories
   */
  @Get('reason-categories')
  getReasonCategories() {
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
