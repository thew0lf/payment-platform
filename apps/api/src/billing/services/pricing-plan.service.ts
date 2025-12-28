import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PricingPlan,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
  PlanStatus,
  PlanType,
} from '../types/billing.types';

interface FindAllAdminOptions {
  planType?: PlanType;
  clientId?: string;
}

@Injectable()
export class PricingPlanService {
  private readonly logger = new Logger(PricingPlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new pricing plan
   */
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
        displayName: dto.displayName || dto.name,
        description: dto.description,
        sortOrder: dto.displayOrder ?? 0,
        isDefault: false,
        billingInterval: dto.billingInterval,
        baseCost: dto.basePrice,
        annualCost: dto.annualPrice,
        currency: 'USD',

        // Plan Type & Visibility
        planType: dto.planType || 'DEFAULT',
        isPublic: dto.isPublic ?? true,
        clientId: dto.clientId,
        basePlanId: dto.basePlanId,

        // Self-service controls
        allowSelfUpgrade: dto.allowSelfUpgrade ?? true,
        allowSelfDowngrade: dto.allowSelfDowngrade ?? false,
        requiresApproval: dto.requiresApproval ?? false,

        // Stripe integration
        stripeProductId: dto.stripeProductId,
        stripePriceId: dto.stripePriceId,
        stripeAnnualPriceId: dto.stripeAnnualPriceId,

        // JSON fields
        included: dto.included as any,
        overage: dto.overage as any,
        features: (dto.features || []) as any,
        limits: (dto.limits || null) as any,

        status: PlanStatus.ACTIVE,
      },
    });

    this.logger.log(`Created pricing plan: ${plan.name} (type: ${plan.planType})`);
    return this.mapToPricingPlan(plan);
  }

  /**
   * Get all public plans (for general listing)
   */
  async findAll(includeHidden = false): Promise<PricingPlan[]> {
    const where: any = {
      planType: 'DEFAULT', // Only show default plans in public listing
      isPublic: true,
      ...(includeHidden ? {} : { status: { in: [PlanStatus.ACTIVE, PlanStatus.DEPRECATED] } }),
    };

    const plans = await this.prisma.pricingPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map(this.mapToPricingPlan.bind(this));
  }

  /**
   * Get plans available to a specific client (public + their custom plans)
   */
  async findAvailableForClient(clientId: string, includeHidden = false): Promise<PricingPlan[]> {
    const statusFilter = includeHidden
      ? {}
      : { status: { in: [PlanStatus.ACTIVE, PlanStatus.DEPRECATED] } };

    const plans = await this.prisma.pricingPlan.findMany({
      where: {
        OR: [
          // Public default plans
          { planType: 'DEFAULT', isPublic: true, ...statusFilter },
          // Custom plans for this client
          { planType: 'CUSTOM', clientId, ...statusFilter },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map(this.mapToPricingPlan.bind(this));
  }

  /**
   * Get plans a client can upgrade to (self-service)
   */
  async findUpgradeablePlans(clientId: string): Promise<PricingPlan[]> {
    // Get current subscription to determine current plan
    const subscription = await this.prisma.clientSubscription.findFirst({
      where: { clientId, status: { not: 'canceled' } },
      include: { plan: true },
    });

    const currentPlanCost = subscription?.plan?.baseCost || 0;

    // Find plans that:
    // 1. Are public default plans OR custom for this client
    // 2. Allow self-upgrade
    // 3. Are higher tier (cost more) than current plan
    const plans = await this.prisma.pricingPlan.findMany({
      where: {
        OR: [
          { planType: 'DEFAULT', isPublic: true },
          { planType: 'CUSTOM', clientId },
        ],
        status: PlanStatus.ACTIVE,
        allowSelfUpgrade: true,
        baseCost: { gt: currentPlanCost },
      },
      orderBy: { baseCost: 'asc' },
    });

    return plans.map(this.mapToPricingPlan.bind(this));
  }

  /**
   * Get all plans for ORG admin view
   */
  async findAllAdmin(options: FindAllAdminOptions = {}): Promise<PricingPlan[]> {
    const where: any = {};

    if (options.planType) {
      where.planType = options.planType;
    }

    if (options.clientId) {
      where.clientId = options.clientId;
    }

    const plans = await this.prisma.pricingPlan.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: [{ planType: 'asc' }, { sortOrder: 'asc' }],
    });

    return plans.map((plan) => ({
      ...this.mapToPricingPlan(plan),
      clientName: (plan as any).client?.name,
      subscriptionCount: (plan as any)._count?.subscriptions || 0,
    }));
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

  async update(id: string, dto: UpdatePricingPlanDto): Promise<PricingPlan> {
    const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Pricing plan ${id} not found`);
    }

    const updateData: any = {};

    // Basic fields
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.displayOrder !== undefined) updateData.sortOrder = dto.displayOrder;
    if (dto.billingInterval !== undefined) updateData.billingInterval = dto.billingInterval;
    if (dto.basePrice !== undefined) updateData.baseCost = dto.basePrice;
    if (dto.annualPrice !== undefined) updateData.annualCost = dto.annualPrice;
    if (dto.status !== undefined) updateData.status = dto.status;

    // Plan type & visibility
    if (dto.planType !== undefined) updateData.planType = dto.planType;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;
    if (dto.clientId !== undefined) updateData.clientId = dto.clientId;
    if (dto.basePlanId !== undefined) updateData.basePlanId = dto.basePlanId;

    // Self-service controls
    if (dto.allowSelfUpgrade !== undefined) updateData.allowSelfUpgrade = dto.allowSelfUpgrade;
    if (dto.allowSelfDowngrade !== undefined) updateData.allowSelfDowngrade = dto.allowSelfDowngrade;
    if (dto.requiresApproval !== undefined) updateData.requiresApproval = dto.requiresApproval;

    // Stripe integration
    if (dto.stripeProductId !== undefined) updateData.stripeProductId = dto.stripeProductId;
    if (dto.stripePriceId !== undefined) updateData.stripePriceId = dto.stripePriceId;
    if (dto.stripeAnnualPriceId !== undefined) updateData.stripeAnnualPriceId = dto.stripeAnnualPriceId;

    // JSON fields
    if (dto.included !== undefined) updateData.included = dto.included as any;
    if (dto.overage !== undefined) updateData.overage = dto.overage as any;
    if (dto.features !== undefined) updateData.features = dto.features as any;
    if (dto.limits !== undefined) updateData.limits = dto.limits as any;

    const plan = await this.prisma.pricingPlan.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated pricing plan: ${plan.name}`);
    return this.mapToPricingPlan(plan);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Pricing plan ${id} not found`);
    }

    // Check if plan has active subscriptions
    const subscriptionCount = await this.prisma.clientSubscription.count({
      where: { planId: id, status: { not: 'canceled' } },
    });

    if (subscriptionCount > 0) {
      // Soft delete - mark as hidden instead of deleting
      await this.prisma.pricingPlan.update({
        where: { id },
        data: { status: PlanStatus.HIDDEN },
      });
      this.logger.log(`Hid pricing plan (has active subscriptions): ${existing.name}`);
    } else {
      await this.prisma.pricingPlan.delete({ where: { id } });
      this.logger.log(`Deleted pricing plan: ${existing.name}`);
    }
  }

  /**
   * Check if a plan change is an upgrade or downgrade
   */
  async isPlanUpgrade(currentPlanId: string, targetPlanId: string): Promise<boolean> {
    const [currentPlan, targetPlan] = await Promise.all([
      this.prisma.pricingPlan.findUnique({ where: { id: currentPlanId } }),
      this.prisma.pricingPlan.findUnique({ where: { id: targetPlanId } }),
    ]);

    if (!currentPlan || !targetPlan) {
      throw new NotFoundException('Plan not found');
    }

    return targetPlan.baseCost > currentPlan.baseCost;
  }

  private mapToPricingPlan(data: any): PricingPlan {
    const included = data.included as any || {};
    const overage = data.overage as any || {};
    const limits = data.limits as any || {};
    const features = data.features as any || [];

    return {
      id: data.id,
      name: data.name,
      displayName: data.displayName || data.name,
      description: data.description,
      displayOrder: data.sortOrder,

      // Plan Type & Visibility
      planType: data.planType as PlanType || PlanType.DEFAULT,
      isPublic: data.isPublic ?? true,
      clientId: data.clientId,
      basePlanId: data.basePlanId,

      // Self-service controls
      allowSelfUpgrade: data.allowSelfUpgrade ?? true,
      allowSelfDowngrade: data.allowSelfDowngrade ?? false,
      requiresApproval: data.requiresApproval ?? false,

      // Stripe integration
      stripeProductId: data.stripeProductId,
      stripePriceId: data.stripePriceId,
      stripeAnnualPriceId: data.stripeAnnualPriceId,

      // Pricing
      billingInterval: data.billingInterval,
      basePrice: data.baseCost,
      annualPrice: data.annualCost,
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
