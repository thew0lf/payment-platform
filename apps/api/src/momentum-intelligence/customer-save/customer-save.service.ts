import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SaveFlowConfiguration,
  SaveOutcome,
  StageHistoryEntry,
  DeliveryChannel,
  InterventionType,
  InterventionStatus,
  InterventionOutcome,
} from '../types/momentum.types';

@Injectable()
export class CustomerSaveService {
  private readonly logger = new Logger(CustomerSaveService.name);

  // Stage names for the 7-stage cascade
  private readonly stageNames: Record<number, string> = {
    1: 'pattern_interrupt',
    2: 'diagnosis_survey',
    3: 'branching_interventions',
    4: 'nuclear_offer',
    5: 'loss_visualization',
    6: 'exit_survey',
    7: 'winback',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SAVE FLOW INITIATION
  // ═══════════════════════════════════════════════════════════════

  async initiateSaveFlow(
    companyId: string,
    customerId: string,
    trigger: string,
  ): Promise<any> {
    // Get flow configuration
    const config = await this.getFlowConfig(companyId);
    if (!config || !config.enabled) {
      throw new BadRequestException('Save flow is not enabled for this company');
    }

    // Check for existing active save attempt
    const existingAttempt = await this.prisma.saveAttempt.findFirst({
      where: {
        companyId,
        customerId,
        outcome: null,
        completedAt: null,
      },
    });

    if (existingAttempt) {
      return existingAttempt;
    }

    // Create new save attempt
    const attempt = await this.prisma.saveAttempt.create({
      data: {
        companyId,
        customerId,
        flowConfigId: config.id,
        currentStage: 1,
        stageHistory: [
          {
            stage: 1,
            stageName: this.stageNames[1],
            enteredAt: new Date().toISOString(),
          },
        ] as any,
      },
    });

    // Create intervention record
    await this.prisma.intervention.create({
      data: {
        companyId,
        customerId,
        type: InterventionType.SAVE_FLOW,
        channel: DeliveryChannel.IN_APP,
        stage: this.stageNames[1],
        status: InterventionStatus.IN_PROGRESS,
      },
    });

    // Emit event
    this.eventEmitter.emit('save.flow.initiated', {
      companyId,
      customerId,
      attemptId: attempt.id,
      trigger,
    });

    this.logger.log(
      `Initiated save flow for customer ${customerId} in company ${companyId}`,
    );

    // Return first stage configuration
    return {
      attempt,
      currentStage: this.getStageConfig(config, 1),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STAGE PROGRESSION
  // ═══════════════════════════════════════════════════════════════

  async progressToNextStage(
    attemptId: string,
    response?: any,
    selectedOption?: string,
  ): Promise<any> {
    const attempt = await this.prisma.saveAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException(`Save attempt ${attemptId} not found`);
    }

    if (attempt.outcome || attempt.completedAt) {
      throw new BadRequestException('Save attempt is already completed');
    }

    const config = await this.getFlowConfig(attempt.companyId);
    const currentStage = attempt.currentStage;
    const stageHistory = (attempt.stageHistory as any[]) || [];

    // Update current stage exit info
    if (stageHistory.length > 0) {
      stageHistory[stageHistory.length - 1].exitedAt = new Date().toISOString();
      stageHistory[stageHistory.length - 1].response = response;
      stageHistory[stageHistory.length - 1].outcome = selectedOption;
    }

    // Check if customer was saved at current stage
    const savedResult = this.checkIfSaved(currentStage, response, selectedOption);
    if (savedResult.saved) {
      return this.completeSaveFlow(attemptId, savedResult.outcome, {
        stage: currentStage,
        response,
        selectedOption,
      });
    }

    // Handle diagnosis survey routing
    let nextStage = currentStage + 1;
    let cancellationReason: string | undefined;
    let reasonCategory: string | undefined;

    if (currentStage === 2 && response?.reason) {
      cancellationReason = response.reason;
      reasonCategory = this.categorizeReason(response.reason);
    }

    // Skip disabled stages
    while (nextStage <= 7) {
      const stageConfig = this.getStageConfig(config, nextStage);
      if (stageConfig?.enabled) break;
      nextStage++;
    }

    // If we've passed all stages, customer is cancelling
    if (nextStage > 7) {
      return this.completeSaveFlow(attemptId, SaveOutcome.CANCELLED, {
        stage: currentStage,
        response,
      });
    }

    // Add new stage to history
    stageHistory.push({
      stage: nextStage,
      stageName: this.stageNames[nextStage],
      enteredAt: new Date().toISOString(),
    });

    // Update attempt
    const updateData: any = {
      currentStage: nextStage,
      stageHistory: stageHistory as any,
    };

    if (cancellationReason) {
      updateData.cancellationReason = cancellationReason;
      updateData.reasonCategory = reasonCategory;
    }

    const updatedAttempt = await this.prisma.saveAttempt.update({
      where: { id: attemptId },
      data: updateData,
    });

    this.logger.log(`Progressed save attempt ${attemptId} to stage ${nextStage}`);

    return {
      attempt: updatedAttempt,
      currentStage: this.getStageConfig(config, nextStage),
      reasonCategory,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SAVE FLOW COMPLETION
  // ═══════════════════════════════════════════════════════════════

  async completeSaveFlow(
    attemptId: string,
    outcome: SaveOutcome,
    details?: any,
  ): Promise<any> {
    const attempt = await this.prisma.saveAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException(`Save attempt ${attemptId} not found`);
    }

    // Calculate revenue preserved if saved
    let revenuePreserved: number | undefined;
    if (
      outcome !== SaveOutcome.CANCELLED &&
      outcome !== SaveOutcome.PAUSED &&
      outcome !== SaveOutcome.DOWNGRADED
    ) {
      revenuePreserved = await this.calculateRevenuePreserved(
        attempt.companyId,
        attempt.customerId,
      );
    }

    // Determine what saved them
    const savedBy = this.determineSavedBy(outcome, details);

    // Update save attempt
    const updatedAttempt = await this.prisma.saveAttempt.update({
      where: { id: attemptId },
      data: {
        outcome,
        savedBy,
        offerAccepted: details?.offer ? (details.offer as any) : undefined,
        revenuePreserved,
        completedAt: new Date(),
      },
    });

    // Update intervention status
    await this.prisma.intervention.updateMany({
      where: {
        companyId: attempt.companyId,
        customerId: attempt.customerId,
        type: InterventionType.SAVE_FLOW,
        status: InterventionStatus.IN_PROGRESS,
      },
      data: {
        status: InterventionStatus.COMPLETED,
        outcome: outcome.startsWith('SAVED') ? InterventionOutcome.SAVED : (outcome as unknown as InterventionOutcome),
        revenueImpact: revenuePreserved,
        executedAt: new Date(),
      },
    });

    // Emit event
    this.eventEmitter.emit('save.flow.completed', {
      companyId: attempt.companyId,
      customerId: attempt.customerId,
      attemptId,
      outcome,
      revenuePreserved,
      savedBy,
    });

    this.logger.log(
      `Completed save flow ${attemptId} with outcome: ${outcome}, revenue preserved: ${revenuePreserved}`,
    );

    return updatedAttempt;
  }

  // ═══════════════════════════════════════════════════════════════
  // FLOW CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  async getFlowConfig(companyId: string): Promise<any> {
    const config = await this.prisma.saveFlowConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      // Return default config
      return this.getDefaultConfig(companyId);
    }

    return config;
  }

  async updateFlowConfig(companyId: string, updates: Partial<any>): Promise<any> {
    const existing = await this.prisma.saveFlowConfig.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.prisma.saveFlowConfig.update({
        where: { companyId },
        data: updates as any,
      });
    }

    // Create with defaults merged with updates
    const defaults = this.getDefaultConfig(companyId);
    return this.prisma.saveFlowConfig.create({
      data: {
        companyId,
        ...defaults,
        ...updates,
      } as any,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private getStageConfig(config: any, stage: number): any {
    switch (stage) {
      case 1:
        return { ...config.patternInterrupt, stage, stageName: 'pattern_interrupt' };
      case 2:
        return { ...config.diagnosisSurvey, stage, stageName: 'diagnosis_survey' };
      case 3:
        return { ...config.branchingInterventions, stage, stageName: 'branching_interventions' };
      case 4:
        return { ...config.nuclearOffer, stage, stageName: 'nuclear_offer' };
      case 5:
        return { ...config.lossVisualization, stage, stageName: 'loss_visualization' };
      case 6:
        return { ...config.exitSurvey, stage, stageName: 'exit_survey' };
      case 7:
        return { ...config.winback, stage, stageName: 'winback' };
      default:
        return null;
    }
  }

  private checkIfSaved(
    stage: number,
    response: any,
    selectedOption?: string,
  ): { saved: boolean; outcome?: SaveOutcome } {
    // Check if the response indicates the customer decided to stay
    if (selectedOption === 'stay' || response?.stayDecision === true) {
      return {
        saved: true,
        outcome: this.getStageOutcome(stage),
      };
    }

    // Check for specific save triggers at each stage
    if (stage === 1 && response?.continueJourney) {
      return { saved: true, outcome: SaveOutcome.SAVED_STAGE_1 };
    }

    if (stage === 3 && response?.acceptedIntervention) {
      return { saved: true, outcome: SaveOutcome.SAVED_STAGE_3 };
    }

    if (stage === 4 && response?.acceptedOffer) {
      return { saved: true, outcome: SaveOutcome.SAVED_STAGE_4 };
    }

    if (stage === 5 && response?.reconsidered) {
      return { saved: true, outcome: SaveOutcome.SAVED_STAGE_5 };
    }

    return { saved: false };
  }

  private getStageOutcome(stage: number): SaveOutcome {
    switch (stage) {
      case 1:
        return SaveOutcome.SAVED_STAGE_1;
      case 2:
        return SaveOutcome.SAVED_STAGE_2;
      case 3:
        return SaveOutcome.SAVED_STAGE_3;
      case 4:
        return SaveOutcome.SAVED_STAGE_4;
      case 5:
        return SaveOutcome.SAVED_STAGE_5;
      default:
        return SaveOutcome.SAVED_STAGE_1;
    }
  }

  private categorizeReason(reason: string): string {
    const reasonLower = reason.toLowerCase();

    if (
      reasonLower.includes('expensive') ||
      reasonLower.includes('price') ||
      reasonLower.includes('cost') ||
      reasonLower.includes('afford') ||
      reasonLower.includes('budget')
    ) {
      return 'too_expensive';
    }

    if (
      reasonLower.includes('product') ||
      reasonLower.includes('taste') ||
      reasonLower.includes('flavor') ||
      reasonLower.includes("don't like") ||
      reasonLower.includes('wrong')
    ) {
      return 'wrong_product';
    }

    if (
      reasonLower.includes('too much') ||
      reasonLower.includes('pile') ||
      reasonLower.includes("can't finish") ||
      reasonLower.includes('backlog')
    ) {
      return 'too_much';
    }

    if (
      reasonLower.includes('shipping') ||
      reasonLower.includes('delivery') ||
      reasonLower.includes('late') ||
      reasonLower.includes('damaged')
    ) {
      return 'shipping_issues';
    }

    if (
      reasonLower.includes("don't use") ||
      reasonLower.includes('not using') ||
      reasonLower.includes('forgot') ||
      reasonLower.includes('busy')
    ) {
      return 'not_using';
    }

    return 'other';
  }

  private determineSavedBy(outcome: SaveOutcome, details?: any): string {
    if (outcome === SaveOutcome.CANCELLED) return 'not_saved';
    if (outcome === SaveOutcome.PAUSED) return 'pause_offer';
    if (outcome === SaveOutcome.DOWNGRADED) return 'downgrade_offer';
    if (outcome === SaveOutcome.SAVED_VOICE) return 'voice_ai';

    const stageNumber = outcome.replace('SAVED_STAGE_', '');
    return `stage_${stageNumber}_${details?.intervention || 'general'}`;
  }

  private async calculateRevenuePreserved(
    companyId: string,
    customerId: string,
  ): Promise<number> {
    // Get active subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: { companyId, customerId, status: 'ACTIVE' },
    });

    if (!subscription) return 0;

    // Calculate LTV based on subscription value and average tenure
    const monthlyValue = Number(subscription.planAmount);
    const avgTenureMonths = 12; // Assume 12 month average lifetime

    return monthlyValue * avgTenureMonths;
  }

  private getDefaultConfig(companyId: string): any {
    return {
      companyId,
      enabled: true,
      patternInterrupt: {
        enabled: true,
        order: 1,
        progressMetric: 'orders',
        progressLabel: 'Your Journey',
      },
      diagnosisSurvey: {
        enabled: true,
        order: 2,
        questions: [
          {
            id: 'main_reason',
            text: "What's the main reason you're considering leaving?",
            category: 'primary',
          },
        ],
        routingRules: [],
      },
      branchingInterventions: {
        enabled: true,
        order: 3,
        branches: {
          tooExpensive: {
            name: 'too_expensive',
            label: "It's too expensive",
            interventions: [
              {
                type: 'discount_offer',
                order: 1,
                config: {
                  discount: 20,
                  duration: 3,
                  messaging: {
                    headline: "We'd hate to lose you over price",
                    body: 'How about 20% off for the next 3 months?',
                    cta: 'Apply Discount',
                  },
                },
              },
            ],
            saveRate: 0.45,
          },
          wrongProduct: {
            name: 'wrong_product',
            label: "It's not what I expected",
            interventions: [
              {
                type: 'product_exchange',
                order: 1,
                config: {
                  messaging: {
                    headline: "Let's find a better match",
                    body: 'We have many options to choose from',
                    cta: 'Browse Products',
                  },
                },
              },
            ],
            saveRate: 0.35,
          },
          tooMuch: {
            name: 'too_much',
            label: 'I have too much',
            interventions: [
              {
                type: 'pause_option',
                order: 1,
                config: {
                  maxDuration: 90,
                  keepBenefits: ['rewards_balance'],
                  messaging: {
                    headline: 'Need a break?',
                    body: 'Pause for up to 3 months. Your rewards will be waiting.',
                    cta: 'Pause Subscription',
                  },
                },
              },
            ],
            saveRate: 0.6,
          },
          shippingIssues: {
            name: 'shipping_issues',
            label: 'Shipping problems',
            interventions: [
              {
                type: 'shipping_recovery',
                order: 1,
                config: {
                  messaging: {
                    headline: "We're sorry for the trouble",
                    body: "Let's make it right",
                    cta: 'Get Help',
                  },
                },
              },
            ],
            saveRate: 0.5,
          },
          notUsing: {
            name: 'not_using',
            label: "I'm not using it",
            interventions: [
              {
                type: 'pause_option',
                order: 1,
                config: {
                  maxDuration: 60,
                  messaging: {
                    headline: 'Life gets busy',
                    body: 'Take a pause and come back when ready',
                    cta: 'Pause Subscription',
                  },
                },
              },
            ],
            saveRate: 0.4,
          },
          other: {
            name: 'other',
            label: 'Other reason',
            interventions: [],
            saveRate: 0.2,
          },
        },
      },
      nuclearOffer: {
        enabled: true,
        order: 4,
        discount: 40,
        duration: 3,
        timerSeconds: 600,
        showOnce: true,
      },
      lossVisualization: {
        enabled: true,
        order: 5,
        showProgress: true,
        showRewardsBalance: true,
        showDiscounts: true,
        showExclusiveAccess: true,
        customLossItems: [],
      },
      exitSurvey: {
        enabled: true,
        order: 6,
        questions: [
          {
            id: 'feedback',
            text: 'Any final feedback for us?',
            type: 'text',
          },
        ],
        winbackOptIn: true,
      },
      winback: {
        enabled: true,
        order: 7,
        sequences: [
          {
            id: 'default_winback',
            name: 'Default Winback',
            steps: [
              { dayOffset: 0, channel: 'EMAIL', templateId: 'winback_day0', offer: { type: 'discount', value: 30 } },
              { dayOffset: 7, channel: 'EMAIL', templateId: 'winback_day7' },
              { dayOffset: 30, channel: 'EMAIL', templateId: 'winback_day30', offer: { type: 'discount', value: 50 } },
            ],
          },
        ],
      },
      voiceAIEnabled: false,
      voiceAIConfig: null,
    };
  }
}
