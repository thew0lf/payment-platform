import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantRiskLevel, MerchantAccountStatus, RiskAssessmentType } from '@prisma/client';
import {
  CreateMerchantRiskProfileDto,
  UpdateMerchantRiskProfileDto,
  TriggerRiskAssessmentDto,
} from '../dto/merchant-risk.dto';
import { GatewayPricingService } from './gateway-pricing.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { HIGH_RISK_MCC_CODES } from '../types/gateway-risk.types';

@Injectable()
export class MerchantRiskProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: GatewayPricingService,
    private readonly riskAssessmentService: RiskAssessmentService,
  ) {}

  async createRiskProfile(dto: CreateMerchantRiskProfileDto) {
    // Check if profile already exists for this client
    const existing = await this.prisma.merchantRiskProfile.findUnique({
      where: { clientId: dto.clientId },
    });

    if (existing) {
      throw new ConflictException(`Risk profile already exists for client ${dto.clientId}`);
    }

    // Determine if MCC is high-risk
    const isHighRiskMCC = dto.mccCode
      ? HIGH_RISK_MCC_CODES.some((mcc) => mcc.code === dto.mccCode)
      : false;

    // Get initial risk level based on MCC
    let initialRiskLevel: MerchantRiskLevel = MerchantRiskLevel.STANDARD;
    if (isHighRiskMCC) {
      const mccInfo = HIGH_RISK_MCC_CODES.find((mcc) => mcc.code === dto.mccCode);
      initialRiskLevel = MerchantRiskLevel.ELEVATED;
      if (mccInfo?.category === 'Gambling' || mccInfo?.category === 'Adult') {
        initialRiskLevel = MerchantRiskLevel.HIGH;
      }
    }

    // Get default pricing tier for the risk level
    const pricingTier = await this.pricingService.getPricingTierByRiskLevel(
      dto.platformIntegrationId,
      initialRiskLevel,
    );

    return this.prisma.merchantRiskProfile.create({
      data: {
        clientId: dto.clientId,
        platformIntegrationId: dto.platformIntegrationId,
        riskLevel: initialRiskLevel,
        accountStatus: MerchantAccountStatus.PENDING_REVIEW,
        pricingTierId: pricingTier?.id,
        mccCode: dto.mccCode,
        mccDescription: dto.mccDescription,
        businessType: dto.businessType,
        businessAge: dto.businessAge,
        annualVolume: dto.annualVolume,
        averageTicket: dto.averageTicket,
        isHighRiskMCC,
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      },
      include: {
        client: true,
        pricingTier: true,
      },
    });
  }

  async updateRiskProfile(clientId: string, dto: UpdateMerchantRiskProfileDto, updatedBy?: string) {
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { clientId },
    });

    if (!profile) {
      throw new NotFoundException(`Risk profile not found for client ${clientId}`);
    }

    // If risk level is changing, update pricing tier
    let pricingTierId = dto.pricingTierId;
    if (dto.riskLevel && dto.riskLevel !== profile.riskLevel && !dto.pricingTierId) {
      const pricingTier = await this.pricingService.getPricingTierByRiskLevel(
        profile.platformIntegrationId,
        dto.riskLevel,
      );
      pricingTierId = pricingTier?.id;
    }

    // Update MCC high-risk flag if MCC code is changing
    let isHighRiskMCC = dto.isHighRiskMCC;
    if (dto.mccCode && dto.mccCode !== profile.mccCode) {
      isHighRiskMCC = HIGH_RISK_MCC_CODES.some((mcc) => mcc.code === dto.mccCode);
    }

    return this.prisma.merchantRiskProfile.update({
      where: { clientId },
      data: {
        ...dto,
        pricingTierId,
        isHighRiskMCC,
        approvedAt: dto.accountStatus === MerchantAccountStatus.APPROVED ? new Date() : undefined,
        approvedBy: dto.accountStatus === MerchantAccountStatus.APPROVED ? updatedBy : undefined,
      },
      include: {
        client: true,
        pricingTier: true,
      },
    });
  }

  async getRiskProfile(clientId: string) {
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { clientId },
      include: {
        client: true,
        pricingTier: true,
        platformIntegration: true,
        riskAssessments: {
          orderBy: { assessmentDate: 'desc' },
          take: 5,
        },
        chargebacks: {
          orderBy: { receivedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Risk profile not found for client ${clientId}`);
    }

    return profile;
  }

  async getRiskProfileById(id: string) {
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { id },
      include: {
        client: true,
        pricingTier: true,
        platformIntegration: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Risk profile ${id} not found`);
    }

    return profile;
  }

  async listRiskProfiles(
    platformIntegrationId?: string,
    filters?: {
      riskLevel?: MerchantRiskLevel;
      accountStatus?: MerchantAccountStatus;
      requiresMonitoring?: boolean;
      isHighRiskMCC?: boolean;
    },
    pagination?: {
      skip?: number;
      take?: number;
    },
  ) {
    const where: Record<string, unknown> = {};

    if (platformIntegrationId) {
      where.platformIntegrationId = platformIntegrationId;
    }
    if (filters?.riskLevel) {
      where.riskLevel = filters.riskLevel;
    }
    if (filters?.accountStatus) {
      where.accountStatus = filters.accountStatus;
    }
    if (filters?.requiresMonitoring !== undefined) {
      where.requiresMonitoring = filters.requiresMonitoring;
    }
    if (filters?.isHighRiskMCC !== undefined) {
      where.isHighRiskMCC = filters.isHighRiskMCC;
    }

    const [items, total] = await Promise.all([
      this.prisma.merchantRiskProfile.findMany({
        where,
        include: {
          client: true,
          pricingTier: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination?.skip,
        take: pagination?.take,
      }),
      this.prisma.merchantRiskProfile.count({ where }),
    ]);

    return { items, total };
  }

  async triggerRiskAssessment(
    clientId: string,
    dto: TriggerRiskAssessmentDto,
    assessedBy: string,
  ) {
    const profile = await this.getRiskProfile(clientId);

    const assessment = await this.riskAssessmentService.performAssessment(
      profile,
      dto.assessmentType,
      assessedBy,
      dto.useAI,
    );

    // If assessment changes risk level, update profile
    if (assessment.newRiskLevel !== profile.riskLevel) {
      await this.updateRiskProfile(clientId, {
        riskLevel: assessment.newRiskLevel,
        riskScore: assessment.newRiskScore,
      });
    }

    return assessment;
  }

  async approveRiskAssessment(assessmentId: string, approvedBy: string) {
    const assessment = await this.prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        merchantRiskProfile: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Risk assessment ${assessmentId} not found`);
    }

    if (!assessment.requiresApproval) {
      throw new BadRequestException('This assessment does not require approval');
    }

    // Apply the assessment's recommended risk level
    await this.updateRiskProfile(assessment.merchantRiskProfile.clientId, {
      riskLevel: assessment.newRiskLevel,
      riskScore: assessment.newRiskScore,
    });

    return this.prisma.riskAssessment.update({
      where: { id: assessmentId },
      data: {
        approvedAt: new Date(),
        approvedBy,
      },
    });
  }

  async approveAccount(clientId: string, approvedBy: string) {
    return this.updateRiskProfile(
      clientId,
      {
        accountStatus: MerchantAccountStatus.APPROVED,
      },
      approvedBy,
    );
  }

  async suspendAccount(clientId: string, reason: string, suspendedBy: string) {
    const profile = await this.getRiskProfile(clientId);

    await this.prisma.merchantRiskProfile.update({
      where: { clientId },
      data: {
        accountStatus: MerchantAccountStatus.SUSPENDED,
        riskLevel: MerchantRiskLevel.SUSPENDED,
        internalNotes: `${profile.internalNotes || ''}\n[${new Date().toISOString()}] Suspended by ${suspendedBy}: ${reason}`,
      },
    });

    return this.getRiskProfile(clientId);
  }

  async getProfilesRequiringReview() {
    const now = new Date();
    return this.prisma.merchantRiskProfile.findMany({
      where: {
        OR: [
          { nextReviewDate: { lte: now } },
          { requiresMonitoring: true },
          { accountStatus: MerchantAccountStatus.UNDER_REVIEW },
        ],
      },
      include: {
        client: true,
        pricingTier: true,
      },
      orderBy: { nextReviewDate: 'asc' },
    });
  }

  async updateProcessingMetrics(
    clientId: string,
    metrics: {
      transactionAmount?: number;
      transactionCount?: number;
      chargebackCount?: number;
      chargebackAmount?: number;
      refundCount?: number;
      refundAmount?: number;
    },
  ) {
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { clientId },
    });

    if (!profile) {
      return;
    }

    const newTotalProcessed = BigInt(profile.totalProcessed) + BigInt(metrics.transactionAmount || 0);
    const newTransactionCount = profile.transactionCount + (metrics.transactionCount || 0);
    const newChargebackCount = profile.chargebackCount + (metrics.chargebackCount || 0);

    // Calculate new chargeback ratio
    const chargebackRatio = newTransactionCount > 0 ? newChargebackCount / newTransactionCount : 0;

    // Check if chargeback ratio exceeds threshold
    const pricingTier = profile.pricingTierId
      ? await this.prisma.gatewayPricingTier.findUnique({
          where: { id: profile.pricingTierId },
        })
      : null;

    const threshold = pricingTier
      ? Number(pricingTier.chargebackThreshold)
      : 0.01;

    const requiresMonitoring = chargebackRatio > threshold * 0.8; // 80% of threshold triggers monitoring
    const needsReview = chargebackRatio > threshold;

    await this.prisma.merchantRiskProfile.update({
      where: { clientId },
      data: {
        totalProcessed: newTotalProcessed,
        transactionCount: newTransactionCount,
        chargebackCount: newChargebackCount,
        chargebackRatio,
        requiresMonitoring,
        hasChargebackHistory: newChargebackCount > 0,
        accountStatus: needsReview ? MerchantAccountStatus.UNDER_REVIEW : undefined,
      },
    });
  }
}
