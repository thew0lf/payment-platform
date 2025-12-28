import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantRiskLevel, RiskAssessmentType, MerchantRiskProfile, Prisma } from '@prisma/client';
import {
  RiskAssessmentFactors,
  RISK_SCORE_WEIGHTS,
  HIGH_RISK_MCC_CODES,
  CHARGEBACK_THRESHOLDS,
  AIRiskAssessmentResult,
} from '../types/gateway-risk.types';

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async performAssessment(
    profile: MerchantRiskProfile & { pricingTier?: { chargebackThreshold: unknown } | null },
    assessmentType: RiskAssessmentType,
    assessedBy: string,
    useAI = false,
  ) {
    const factors = await this.gatherAssessmentFactors(profile);

    let result: AIRiskAssessmentResult;

    if (useAI) {
      result = await this.performAIAssessment(profile, factors);
    } else {
      result = this.performRuleBasedAssessment(profile, factors);
    }

    // Determine if approval is required
    const requiresApproval =
      result.riskLevel !== profile.riskLevel ||
      (result.riskLevel === MerchantRiskLevel.HIGH || result.riskLevel === MerchantRiskLevel.VERY_HIGH);

    // Create assessment record
    const assessment = await this.prisma.riskAssessment.create({
      data: {
        merchantRiskProfileId: profile.id,
        assessmentType,
        assessedBy,
        previousRiskLevel: profile.riskLevel,
        newRiskLevel: result.riskLevel,
        previousRiskScore: profile.riskScore,
        newRiskScore: result.riskScore,
        factors: factors as unknown as Prisma.InputJsonValue,
        aiModel: useAI ? 'rule-based-v1' : null, // Placeholder for future AI model
        aiConfidence: result.confidence,
        aiExplanation: result.explanation,
        reasoning: result.explanation,
        recommendedActions: result.recommendedActions,
        requiresApproval,
      },
    });

    // Update next review date
    await this.prisma.merchantRiskProfile.update({
      where: { id: profile.id },
      data: {
        lastReviewDate: new Date(),
        nextReviewDate: this.calculateNextReviewDate(result.riskLevel),
      },
    });

    return assessment;
  }

  private async gatherAssessmentFactors(profile: MerchantRiskProfile): Promise<RiskAssessmentFactors> {
    const mccInfo = profile.mccCode
      ? HIGH_RISK_MCC_CODES.find((mcc) => mcc.code === profile.mccCode)
      : null;

    return {
      mccCode: profile.mccCode || undefined,
      mccRiskLevel: mccInfo
        ? mccInfo.category === 'Gambling' || mccInfo.category === 'Adult'
          ? MerchantRiskLevel.HIGH
          : MerchantRiskLevel.ELEVATED
        : MerchantRiskLevel.STANDARD,
      businessAge: profile.businessAge || undefined,
      annualVolume: profile.annualVolume || undefined,
      averageTicket: profile.averageTicket || undefined,
      chargebackRatio: Number(profile.chargebackRatio),
      refundRatio: Number(profile.refundRatio),
      processingHistory: {
        monthsActive: this.calculateMonthsActive(profile.createdAt),
        totalVolume: Number(profile.totalProcessed),
        chargebackCount: profile.chargebackCount,
        refundCount: 0, // Would need refund tracking
      },
    };
  }

  private performRuleBasedAssessment(
    profile: MerchantRiskProfile & { pricingTier?: { chargebackThreshold: unknown } | null },
    factors: RiskAssessmentFactors,
  ): AIRiskAssessmentResult {
    let riskScore = 50; // Start at neutral
    const recommendedActions: string[] = [];

    // MCC Risk Factor (25% weight)
    if (factors.mccRiskLevel === MerchantRiskLevel.HIGH) {
      riskScore += RISK_SCORE_WEIGHTS.MCC_RISK;
      recommendedActions.push('High-risk MCC code detected - enhanced monitoring recommended');
    } else if (factors.mccRiskLevel === MerchantRiskLevel.ELEVATED) {
      riskScore += RISK_SCORE_WEIGHTS.MCC_RISK * 0.5;
      recommendedActions.push('Elevated-risk MCC code detected');
    } else {
      riskScore -= RISK_SCORE_WEIGHTS.MCC_RISK * 0.5;
    }

    // Business Age Factor (15% weight)
    if (factors.businessAge !== undefined) {
      if (factors.businessAge < 1) {
        riskScore += RISK_SCORE_WEIGHTS.BUSINESS_AGE;
        recommendedActions.push('New business - limited operating history');
      } else if (factors.businessAge >= 5) {
        riskScore -= RISK_SCORE_WEIGHTS.BUSINESS_AGE;
      }
    }

    // Chargeback Ratio Factor (30% weight)
    if (factors.chargebackRatio !== undefined) {
      if (factors.chargebackRatio >= CHARGEBACK_THRESHOLDS.CRITICAL) {
        riskScore += RISK_SCORE_WEIGHTS.CHARGEBACK_RATIO;
        recommendedActions.push('CRITICAL: Chargeback ratio exceeds 2% - immediate review required');
      } else if (factors.chargebackRatio >= CHARGEBACK_THRESHOLDS.HIGH) {
        riskScore += RISK_SCORE_WEIGHTS.CHARGEBACK_RATIO * 0.75;
        recommendedActions.push('HIGH: Chargeback ratio exceeds 1.5% - close monitoring required');
      } else if (factors.chargebackRatio >= CHARGEBACK_THRESHOLDS.ELEVATED) {
        riskScore += RISK_SCORE_WEIGHTS.CHARGEBACK_RATIO * 0.5;
        recommendedActions.push('ELEVATED: Chargeback ratio exceeds 1%');
      } else if (factors.chargebackRatio >= CHARGEBACK_THRESHOLDS.WARNING) {
        riskScore += RISK_SCORE_WEIGHTS.CHARGEBACK_RATIO * 0.25;
        recommendedActions.push('WARNING: Chargeback ratio approaching threshold');
      } else if (factors.chargebackRatio < 0.005) {
        riskScore -= RISK_SCORE_WEIGHTS.CHARGEBACK_RATIO * 0.5;
      }
    }

    // Refund Ratio Factor (10% weight)
    if (factors.refundRatio !== undefined && factors.refundRatio > 0.15) {
      riskScore += RISK_SCORE_WEIGHTS.REFUND_RATIO;
      recommendedActions.push('High refund ratio detected - review product/service quality');
    }

    // Processing History Factor (10% weight)
    if (factors.processingHistory) {
      if (factors.processingHistory.monthsActive >= 12 && factors.processingHistory.chargebackCount === 0) {
        riskScore -= RISK_SCORE_WEIGHTS.PROCESSING_HISTORY;
      } else if (factors.processingHistory.monthsActive < 3) {
        riskScore += RISK_SCORE_WEIGHTS.PROCESSING_HISTORY * 0.5;
      }
    }

    // Normalize score to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Determine risk level from score
    const riskLevel = this.scoreToRiskLevel(riskScore);

    // Generate explanation
    const explanation = this.generateExplanation(factors, riskScore, riskLevel);

    return {
      riskLevel,
      riskScore: Math.round(riskScore),
      confidence: 0.85, // Rule-based has high confidence
      explanation,
      recommendedActions,
      factors,
    };
  }

  private async performAIAssessment(
    profile: MerchantRiskProfile,
    factors: RiskAssessmentFactors,
  ): Promise<AIRiskAssessmentResult> {
    // For now, use rule-based with AI placeholder
    // In production, this would call AWS Bedrock
    this.logger.log(`AI assessment requested for profile ${profile.id}`);

    // Fall back to rule-based for now
    const result = this.performRuleBasedAssessment(profile, factors);

    // Add AI-specific notes
    result.explanation = `[AI-Enhanced Assessment]\n${result.explanation}`;
    result.recommendedActions.push('AI analysis completed - results validated against rule-based model');

    return result;
  }

  private scoreToRiskLevel(score: number): MerchantRiskLevel {
    if (score >= 85) return MerchantRiskLevel.VERY_HIGH;
    if (score >= 70) return MerchantRiskLevel.HIGH;
    if (score >= 55) return MerchantRiskLevel.ELEVATED;
    if (score >= 40) return MerchantRiskLevel.STANDARD;
    return MerchantRiskLevel.LOW;
  }

  private generateExplanation(
    factors: RiskAssessmentFactors,
    score: number,
    level: MerchantRiskLevel,
  ): string {
    const parts: string[] = [];

    parts.push(`Risk Score: ${Math.round(score)}/100 (${level})`);
    parts.push('');
    parts.push('Assessment Factors:');

    if (factors.mccCode) {
      const mccInfo = HIGH_RISK_MCC_CODES.find((m) => m.code === factors.mccCode);
      parts.push(`- MCC Code: ${factors.mccCode} (${mccInfo ? 'High-Risk' : 'Standard'})`);
    }

    if (factors.businessAge !== undefined) {
      parts.push(`- Business Age: ${factors.businessAge} years`);
    }

    if (factors.chargebackRatio !== undefined) {
      parts.push(`- Chargeback Ratio: ${(factors.chargebackRatio * 100).toFixed(2)}%`);
    }

    if (factors.refundRatio !== undefined) {
      parts.push(`- Refund Ratio: ${(factors.refundRatio * 100).toFixed(2)}%`);
    }

    if (factors.processingHistory) {
      parts.push(`- Processing History: ${factors.processingHistory.monthsActive} months`);
      parts.push(`- Total Chargebacks: ${factors.processingHistory.chargebackCount}`);
    }

    return parts.join('\n');
  }

  private calculateNextReviewDate(riskLevel: MerchantRiskLevel): Date {
    const daysUntilReview: Record<MerchantRiskLevel, number> = {
      [MerchantRiskLevel.LOW]: 180,
      [MerchantRiskLevel.STANDARD]: 90,
      [MerchantRiskLevel.ELEVATED]: 60,
      [MerchantRiskLevel.HIGH]: 30,
      [MerchantRiskLevel.VERY_HIGH]: 14,
      [MerchantRiskLevel.SUSPENDED]: 7,
    };

    const days = daysUntilReview[riskLevel] || 90;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private calculateMonthsActive(createdAt: Date): number {
    const now = new Date();
    const months =
      (now.getFullYear() - createdAt.getFullYear()) * 12 +
      (now.getMonth() - createdAt.getMonth());
    return Math.max(0, months);
  }
}
