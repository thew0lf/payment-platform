import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ContinuityConfig,
  FlowState,
  FrictionLevel,
  ContinuityEvent,
  ContinuityMetrics,
  TrustSignal,
  EngineeredRealityContext,
} from './interfaces/continuity.interfaces';
import {
  StartFlowDto,
  UpdateFlowDto,
  CalculateFrictionDto,
  FrictionResultDto,
} from './dto/continuity.dto';

@Injectable()
export class ContinuityService {
  private readonly logger = new Logger(ContinuityService.name);
  private readonly flows = new Map<string, FlowState>();
  private config: ContinuityConfig;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.config = this.getDefaultConfig();
  }

  /**
   * Get the default continuity configuration
   * Based on Chase Hughes' NCI principles
   */
  private getDefaultConfig(): ContinuityConfig {
    return {
      momentum: {
        enableMicroConfirmations: true,
        progressIndicatorStyle: 'steps',
        autoAdvanceDelay: 500,
      },
      trust: {
        showSecurityIndicators: true,
        displaySocialProof: true,
        transactionCountThreshold: 100,
        showComplianceBadges: ['PCI-DSS', 'SOC2', 'GDPR'],
      },
      friction: {
        oneClickThreshold: 100,
        confirmationRequired: 500,
        stepUpAuthThreshold: 1000,
      },
      cognitive: {
        maxDecisionPoints: 3,
        progressiveDisclosure: true,
        inlineValidation: true,
      },
    };
  }

  /**
   * Get current continuity configuration
   */
  getConfig(): ContinuityConfig {
    return { ...this.config };
  }

  /**
   * Update continuity configuration
   */
  updateConfig(updates: Partial<ContinuityConfig>): ContinuityConfig {
    this.config = {
      momentum: { ...this.config.momentum, ...updates.momentum },
      trust: { ...this.config.trust, ...updates.trust },
      friction: { ...this.config.friction, ...updates.friction },
      cognitive: { ...this.config.cognitive, ...updates.cognitive },
    };
    this.logger.log('Continuity configuration updated');
    return this.getConfig();
  }

  /**
   * Start a new payment flow
   * Implements the PRIME phase of Engineered Reality
   */
  startFlow(dto: StartFlowDto): FlowState {
    const now = new Date();
    const frictionLevel = dto.transactionAmount
      ? this.calculateFrictionLevel(dto.transactionAmount)
      : FrictionLevel.LOW;

    const flowState: FlowState = {
      sessionId: dto.sessionId,
      currentStep: 1,
      totalSteps: dto.totalSteps,
      startedAt: now,
      lastActivityAt: now,
      momentumScore: 100, // Start with full momentum
      frictionLevel,
      trustSignals: this.generateTrustSignals(),
    };

    this.flows.set(dto.sessionId, flowState);
    this.emitEvent(ContinuityEvent.FLOW_STARTED, { sessionId: dto.sessionId });
    this.logger.log(`Flow started: ${dto.sessionId}`);

    return flowState;
  }

  /**
   * Get current flow state
   */
  getFlowState(sessionId: string): FlowState | null {
    return this.flows.get(sessionId) || null;
  }

  /**
   * Update flow progress
   * Maintains behavioral momentum through the COMMIT phase
   */
  updateFlow(sessionId: string, dto: UpdateFlowDto): FlowState | null {
    const flow = this.flows.get(sessionId);
    if (!flow) {
      return null;
    }

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - flow.lastActivityAt.getTime();
    const momentumDecay = this.calculateMomentumDecay(timeSinceLastActivity);

    // Update momentum score based on time gap
    flow.momentumScore = Math.max(0, flow.momentumScore - momentumDecay);
    flow.currentStep = dto.currentStep;
    flow.lastActivityAt = now;

    // Emit appropriate momentum event
    if (flow.momentumScore > 50) {
      this.emitEvent(ContinuityEvent.MOMENTUM_MAINTAINED, { sessionId, score: flow.momentumScore });
    } else {
      this.emitEvent(ContinuityEvent.MOMENTUM_BROKEN, { sessionId, score: flow.momentumScore });
    }

    this.flows.set(sessionId, flow);
    return flow;
  }

  /**
   * Complete a flow
   * Implements the CLOSE phase of Engineered Reality
   */
  completeFlow(sessionId: string): FlowState | null {
    const flow = this.flows.get(sessionId);
    if (!flow) {
      return null;
    }

    this.emitEvent(ContinuityEvent.FLOW_COMPLETED, {
      sessionId,
      duration: new Date().getTime() - flow.startedAt.getTime(),
      finalMomentum: flow.momentumScore,
    });

    this.logger.log(`Flow completed: ${sessionId}`);
    this.flows.delete(sessionId);
    return flow;
  }

  /**
   * Abandon a flow
   */
  abandonFlow(sessionId: string): void {
    const flow = this.flows.get(sessionId);
    if (flow) {
      this.emitEvent(ContinuityEvent.FLOW_ABANDONED, {
        sessionId,
        abandonedAtStep: flow.currentStep,
        momentumAtAbandonment: flow.momentumScore,
      });
      this.flows.delete(sessionId);
      this.logger.log(`Flow abandoned: ${sessionId} at step ${flow.currentStep}`);
    }
  }

  /**
   * Calculate appropriate friction level for a transaction
   * Implements Friction Calibration principle
   */
  calculateFriction(dto: CalculateFrictionDto): FrictionResultDto {
    const { amount, riskScore = 0, isReturningUser = false } = dto;
    const { friction } = this.config;

    let level = FrictionLevel.NONE;
    let reason = 'Standard transaction';

    // Determine friction level based on amount and risk
    if (amount >= friction.stepUpAuthThreshold || riskScore > 70) {
      level = FrictionLevel.HIGH;
      reason = amount >= friction.stepUpAuthThreshold
        ? 'High-value transaction requires additional verification'
        : 'Elevated risk score detected';
    } else if (amount >= friction.confirmationRequired || riskScore > 50) {
      level = FrictionLevel.MEDIUM;
      reason = 'Transaction requires confirmation';
    } else if (amount > friction.oneClickThreshold || !isReturningUser) {
      level = FrictionLevel.LOW;
      reason = isReturningUser ? 'Standard verification' : 'New user verification';
    }

    const result: FrictionResultDto = {
      level,
      requiresConfirmation: amount >= friction.confirmationRequired,
      requiresStepUpAuth: amount >= friction.stepUpAuthThreshold || riskScore > 70,
      oneClickEligible: amount <= friction.oneClickThreshold && isReturningUser && riskScore < 30,
      reason,
    };

    this.emitEvent(
      result.oneClickEligible ? ContinuityEvent.FRICTION_BYPASSED : ContinuityEvent.FRICTION_APPLIED,
      { amount, level, reason }
    );

    return result;
  }

  /**
   * Generate Engineered Reality context for optimal payment experience
   */
  generateEngineeredContext(
    userSegment: string,
    transactionAmount: number,
    previousPurchases: number[] = []
  ): EngineeredRealityContext {
    const avgPrevious = previousPurchases.length > 0
      ? previousPurchases.reduce((a, b) => a + b, 0) / previousPurchases.length
      : undefined;

    return {
      prime: {
        userSegment,
        previousInteractions: previousPurchases.length,
        riskScore: this.calculateRiskScore(previousPurchases),
      },
      frame: {
        productValue: transactionAmount,
        comparisonAnchor: avgPrevious ? avgPrevious * 1.2 : undefined,
        urgencyLevel: 'none',
      },
      anchor: {
        previousPurchaseAmount: previousPurchases[previousPurchases.length - 1],
        marketAverage: avgPrevious,
      },
    };
  }

  /**
   * Get continuity metrics
   */
  getMetrics(): ContinuityMetrics {
    // In production, these would be calculated from actual data
    return {
      flowCompletionRate: 87.5,
      averageTimeToPayment: 45,
      abandonmentRate: 12.5,
      trustScoreImpact: 0.23,
      frictionEfficiency: 96.2,
    };
  }

  /**
   * Calculate momentum decay based on time gap
   * Users lose momentum the longer they're inactive
   */
  private calculateMomentumDecay(timeGapMs: number): number {
    const seconds = timeGapMs / 1000;
    // Decay formula: 1 point per 3 seconds of inactivity
    return Math.floor(seconds / 3);
  }

  /**
   * Calculate friction level from amount
   */
  private calculateFrictionLevel(amount: number): FrictionLevel {
    const { friction } = this.config;
    if (amount >= friction.stepUpAuthThreshold) return FrictionLevel.HIGH;
    if (amount >= friction.confirmationRequired) return FrictionLevel.MEDIUM;
    if (amount > friction.oneClickThreshold) return FrictionLevel.LOW;
    return FrictionLevel.NONE;
  }

  /**
   * Calculate risk score based on user history
   */
  private calculateRiskScore(previousPurchases: number[]): number {
    if (previousPurchases.length === 0) return 50; // Unknown user = medium risk
    if (previousPurchases.length > 10) return 10; // Trusted user
    return Math.max(10, 50 - previousPurchases.length * 4);
  }

  /**
   * Generate trust signals based on configuration
   */
  private generateTrustSignals(): TrustSignal[] {
    const signals: TrustSignal[] = [];
    const { trust } = this.config;

    if (trust.displaySocialProof) {
      signals.push({
        type: 'transaction_count' as any,
        value: 50000,
        displayText: '50,000+ successful transactions',
        priority: 1,
      });
    }

    if (trust.showSecurityIndicators) {
      signals.push({
        type: 'security_badge' as any,
        value: 'ssl_secured',
        displayText: '256-bit SSL Encryption',
        priority: 2,
      });
    }

    trust.showComplianceBadges.forEach((badge, index) => {
      signals.push({
        type: 'compliance_cert' as any,
        value: badge,
        displayText: `${badge} Compliant`,
        priority: 10 + index,
      });
    });

    return signals;
  }

  /**
   * Emit continuity events for analytics
   */
  private emitEvent(event: ContinuityEvent, payload: Record<string, unknown>): void {
    this.eventEmitter.emit(event, {
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
}
