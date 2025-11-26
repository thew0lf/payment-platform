import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PricingPlan,
  CreatePricingPlanDto,
  PlanStatus,
  PlanFeatures,
} from '../types/billing.types';

@Injectable()
export class PricingPlanService {
  private readonly logger = new Logger(PricingPlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePricingPlanDto): Promise<PricingPlan> {
    const existing = await this.prisma.pricingPlan.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Plan "${dto.name}" already exists`);
    }

    const plan = await this.prisma.pricingPlan.create({
      data: {
        name: dto.name,
        displayName: dto.name,
        description: dto.description,
        sortOrder: dto.displayOrder ?? 0,
        isDefault: false,
        billingInterval: dto.billingInterval,
        baseCost: dto.basePrice,
        currency: 'USD',

        // JSON fields
        included: dto.included as any,
        overage: dto.overage as any,
        features: (dto.features || []) as any,
        limits: (dto.limits || null) as any,

        status: PlanStatus.ACTIVE,
      },
    });

    this.logger.log(`Created pricing plan: ${plan.name}`);
    return this.mapToPricingPlan(plan);
  }

  async findAll(includeHidden = false): Promise<PricingPlan[]> {
    const where: any = { status: PlanStatus.ACTIVE };

    const plans = await this.prisma.pricingPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map(this.mapToPricingPlan.bind(this));
  }

  async findById(id: string): Promise<PricingPlan> {
    const plan = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Pricing plan ${id} not found`);
    }
    return this.mapToPricingPlan(plan);
  }

  async findByName(name: string): Promise<PricingPlan> {
    const plan = await this.prisma.pricingPlan.findUnique({ where: { name } });
    if (!plan) {
      throw new NotFoundException(`Pricing plan "${name}" not found`);
    }
    return this.mapToPricingPlan(plan);
  }

  private mapToPricingPlan(data: any): PricingPlan {
    const included = data.included as any || {};
    const overage = data.overage as any || {};
    const limits = data.limits as any || {};
    const features = data.features as any || [];

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      displayOrder: data.sortOrder,
      isPublic: true,
      isCustom: data.metadata?.isCustomPricing || false,
      billingInterval: data.billingInterval,
      basePrice: data.baseCost,
      annualDiscount: 0,
      included: {
        transactions: included.transactions || 0,
        volume: included.volume || 0,
        merchantAccounts: included.merchantAccounts || 0,
        companies: included.companies || 0,
        teamMembers: included.users || 0,
        apiCalls: included.apiCalls || 0,
        vaultEntries: included.vaultEntries || 0,
      },
      overage: {
        transactionPrice: overage.transactionPrice || 0,
        volumePercent: overage.volumePercent || 0,
        merchantAccountPrice: overage.merchantAccountPrice || 0,
        companyPrice: overage.companyPrice || 0,
        teamMemberPrice: overage.userPrice || 0,
        apiCallPrice: overage.apiCallPrice || 0,
        vaultEntryPrice: overage.vaultEntryPrice || 0,
      },
      transactionTiers: null,
      volumeTiers: null,
      features: Array.isArray(features)
        ? features.reduce((acc: any, f: string) => ({ ...acc, [f]: true }), {})
        : features,
      limits: {
        maxMerchantAccounts: limits.maxMerchantAccounts,
        maxCompanies: limits.maxCompanies,
        maxTeamMembers: limits.maxUsers,
        maxTransactionsPerMonth: limits.maxTransactionsPerMonth,
        maxVolumePerMonth: limits.maxVolumePerMonth,
      },
      status: data.status as PlanStatus,
      effectiveDate: data.createdAt,
      sunsetDate: undefined,
    };
  }
}
