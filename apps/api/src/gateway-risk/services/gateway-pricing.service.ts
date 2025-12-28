import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantRiskLevel } from '@prisma/client';
import { CreateGatewayPricingTierDto, UpdateGatewayPricingTierDto } from '../dto/gateway-pricing.dto';
import { DEFAULT_PRICING_TIERS } from '../types/gateway-risk.types';

@Injectable()
export class GatewayPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async createPricingTier(dto: CreateGatewayPricingTierDto) {
    // Check for existing tier with same risk level for this integration
    const existing = await this.prisma.gatewayPricingTier.findFirst({
      where: {
        platformIntegrationId: dto.platformIntegrationId,
        riskLevel: dto.riskLevel,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Pricing tier for risk level ${dto.riskLevel} already exists for this integration`,
      );
    }

    return this.prisma.gatewayPricingTier.create({
      data: {
        platformIntegrationId: dto.platformIntegrationId,
        tierName: dto.tierName,
        riskLevel: dto.riskLevel,
        transactionPercentage: dto.transactionPercentage,
        transactionFlat: dto.transactionFlat,
        chargebackFee: dto.chargebackFee,
        chargebackReviewFee: dto.chargebackReviewFee ?? 0,
        reservePercentage: dto.reservePercentage,
        reserveHoldDays: dto.reserveHoldDays,
        reserveCap: dto.reserveCap,
        applicationFee: dto.applicationFee ?? 0,
        isFounderPricing: dto.isFounderPricing ?? false,
        setupFee: dto.setupFee,
        monthlyFee: dto.monthlyFee,
        monthlyMinimum: dto.monthlyMinimum,
        securityDepositMin: dto.securityDepositMin,
        securityDepositMax: dto.securityDepositMax,
        chargebackThreshold: dto.chargebackThreshold ?? 0.01,
      },
    });
  }

  async updatePricingTier(id: string, dto: UpdateGatewayPricingTierDto) {
    const tier = await this.prisma.gatewayPricingTier.findUnique({
      where: { id },
    });

    if (!tier) {
      throw new NotFoundException(`Pricing tier ${id} not found`);
    }

    return this.prisma.gatewayPricingTier.update({
      where: { id },
      data: dto,
    });
  }

  async getPricingTier(id: string) {
    const tier = await this.prisma.gatewayPricingTier.findUnique({
      where: { id },
      include: {
        platformIntegration: true,
      },
    });

    if (!tier) {
      throw new NotFoundException(`Pricing tier ${id} not found`);
    }

    return tier;
  }

  async getPricingTiersForIntegration(platformIntegrationId: string) {
    return this.prisma.gatewayPricingTier.findMany({
      where: {
        platformIntegrationId,
        isActive: true,
      },
      orderBy: {
        riskLevel: 'asc',
      },
    });
  }

  async getPricingTierByRiskLevel(platformIntegrationId: string, riskLevel: MerchantRiskLevel) {
    return this.prisma.gatewayPricingTier.findFirst({
      where: {
        platformIntegrationId,
        riskLevel,
        isActive: true,
      },
    });
  }

  async deletePricingTier(id: string) {
    const tier = await this.prisma.gatewayPricingTier.findUnique({
      where: { id },
      include: {
        merchantProfiles: true,
      },
    });

    if (!tier) {
      throw new NotFoundException(`Pricing tier ${id} not found`);
    }

    if (tier.merchantProfiles.length > 0) {
      throw new ConflictException(
        `Cannot delete pricing tier with ${tier.merchantProfiles.length} active merchant profiles`,
      );
    }

    return this.prisma.gatewayPricingTier.delete({
      where: { id },
    });
  }

  async initializeDefaultPricingTiers(platformIntegrationId: string, isFounderPricing = false) {
    const existingTiers = await this.prisma.gatewayPricingTier.findMany({
      where: { platformIntegrationId },
    });

    if (existingTiers.length > 0) {
      return existingTiers;
    }

    const tiers = await Promise.all(
      DEFAULT_PRICING_TIERS.map((tierConfig) =>
        this.prisma.gatewayPricingTier.create({
          data: {
            platformIntegrationId,
            tierName: tierConfig.tierName,
            riskLevel: tierConfig.riskLevel,
            transactionPercentage: tierConfig.transactionPercentage,
            transactionFlat: tierConfig.transactionFlat,
            chargebackFee: tierConfig.chargebackFee,
            chargebackReviewFee: 0,
            reservePercentage: tierConfig.reservePercentage,
            reserveHoldDays: tierConfig.reserveHoldDays,
            securityDepositMin: tierConfig.securityDepositMin,
            securityDepositMax: tierConfig.securityDepositMax,
            chargebackThreshold: tierConfig.chargebackThreshold,
            applicationFee: 0, // $0 for founders
            isFounderPricing,
          },
        }),
      ),
    );

    return tiers;
  }

  formatPricingForDisplay(tier: {
    transactionPercentage: number | { toNumber: () => number };
    transactionFlat: number;
    chargebackFee: number;
    reservePercentage: number | { toNumber: () => number };
    reserveHoldDays: number;
    setupFee?: number | null;
    monthlyFee?: number | null;
    securityDepositMin?: number | null;
    securityDepositMax?: number | null;
    applicationFee: number;
  }) {
    const percentage =
      typeof tier.transactionPercentage === 'number'
        ? tier.transactionPercentage
        : tier.transactionPercentage.toNumber();
    const reservePct =
      typeof tier.reservePercentage === 'number'
        ? tier.reservePercentage
        : tier.reservePercentage.toNumber();

    return {
      transactionFee: `${(percentage * 100).toFixed(2)}% + $${(tier.transactionFlat / 100).toFixed(2)}`,
      chargebackFee: `$${(tier.chargebackFee / 100).toFixed(2)}`,
      reserve: reservePct > 0 ? `${(reservePct * 100).toFixed(1)}% held for ${tier.reserveHoldDays} days` : 'None',
      setupFee: tier.setupFee ? `$${(tier.setupFee / 100).toFixed(2)}` : 'None',
      monthlyFee: tier.monthlyFee ? `$${(tier.monthlyFee / 100).toFixed(2)}/month` : 'None',
      securityDeposit:
        tier.securityDepositMin && tier.securityDepositMax
          ? `$${(tier.securityDepositMin / 100).toFixed(0)} - $${(tier.securityDepositMax / 100).toFixed(0)}`
          : tier.securityDepositMin
            ? `$${(tier.securityDepositMin / 100).toFixed(0)}+`
            : 'None',
      applicationFee: tier.applicationFee > 0 ? `$${(tier.applicationFee / 100).toFixed(2)}` : 'Free',
    };
  }
}
