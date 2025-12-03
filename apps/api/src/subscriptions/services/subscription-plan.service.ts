import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginationService, CursorPaginatedResponse } from '../../common/pagination';
import {
  SubscriptionPlan,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscriptionPlanQueryDto,
  SubscriptionPlanStats,
  ProductSubscriptionPlan,
  AttachPlanToProductDto,
  UpdateProductPlanDto,
  LoyaltyTier,
} from '../types/subscription-plan.types';

@Injectable()
export class SubscriptionPlanService {
  private readonly logger = new Logger(SubscriptionPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly paginationService: PaginationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // PLAN QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Find all subscription plans with filtering and pagination
   */
  async findAll(
    query: SubscriptionPlanQueryDto,
  ): Promise<{ plans: SubscriptionPlan[]; total: number }> {
    const where = this.buildWhereClause(query);

    const [plans, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        include: {
          _count: {
            select: { productPlans: true },
          },
          downsellPlan: {
            select: { id: true, name: true, displayName: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: query.offset || 0,
        take: query.limit || 50,
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return {
      plans: plans.map((p) => this.mapToPlan(p)),
      total,
    };
  }

  /**
   * Cursor-based pagination for large datasets
   */
  async findAllWithCursor(
    query: SubscriptionPlanQueryDto,
  ): Promise<CursorPaginatedResponse<SubscriptionPlan>> {
    const baseWhere = this.buildWhereClause(query);

    const { limit, cursorWhere, orderBy } = this.paginationService.parseCursor(
      { cursor: query.cursor, limit: query.limit },
      'createdAt',
      'desc',
    );

    const where = cursorWhere ? { AND: [baseWhere, cursorWhere] } : baseWhere;

    const plans = await this.prisma.subscriptionPlan.findMany({
      where,
      include: {
        _count: {
          select: { productPlans: true },
        },
        downsellPlan: {
          select: { id: true, name: true, displayName: true },
        },
      },
      orderBy,
      take: limit + 1,
    });

    const estimatedTotal = await this.prisma.subscriptionPlan.count({
      where: baseWhere,
    });

    return this.paginationService.createResponse(
      plans.map((p) => this.mapToPlan(p)),
      limit,
      { cursor: query.cursor, limit: query.limit },
      'createdAt',
      estimatedTotal,
    );
  }

  /**
   * Find a single plan by ID
   */
  async findById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productPlans: true },
        },
        downsellPlan: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan ${id} not found`);
    }

    return this.mapToPlan(plan);
  }

  /**
   * Get plans available for a specific company (includes client and org plans)
   */
  async findAvailableForCompany(companyId: string): Promise<SubscriptionPlan[]> {
    // Get company's client ID
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true, client: { select: { organizationId: true } } },
    });

    if (!company) {
      throw new NotFoundException(`Company ${companyId} not found`);
    }

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        deletedAt: null,
        status: SubscriptionPlanStatus.ACTIVE,
        OR: [
          { scope: SubscriptionPlanScope.ORGANIZATION, organizationId: company.client?.organizationId },
          { scope: SubscriptionPlanScope.CLIENT, clientId: company.clientId },
          { scope: SubscriptionPlanScope.COMPANY, companyId },
        ],
      },
      include: {
        _count: {
          select: { productPlans: true },
        },
      },
      orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }],
    });

    return plans.map((p) => this.mapToPlan(p));
  }

  /**
   * Get plans attached to a specific product
   */
  async findByProduct(productId: string): Promise<ProductSubscriptionPlan[]> {
    const productPlans = await this.prisma.productSubscriptionPlan.findMany({
      where: { productId },
      include: {
        plan: {
          include: {
            _count: {
              select: { productPlans: true },
            },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    });

    return productPlans.map((pp) => this.mapToProductPlan(pp));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  async getStats(
    scope?: SubscriptionPlanScope,
    scopeId?: string,
  ): Promise<SubscriptionPlanStats> {
    const baseWhere: any = { deletedAt: null };

    if (scope && scopeId) {
      baseWhere.scope = scope;
      switch (scope) {
        case SubscriptionPlanScope.ORGANIZATION:
          baseWhere.organizationId = scopeId;
          break;
        case SubscriptionPlanScope.CLIENT:
          baseWhere.clientId = scopeId;
          break;
        case SubscriptionPlanScope.COMPANY:
          baseWhere.companyId = scopeId;
          break;
      }
    }

    const [statusCounts, scopeCounts, productAssignments] = await Promise.all([
      this.prisma.subscriptionPlan.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.subscriptionPlan.groupBy({
        by: ['scope'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.productSubscriptionPlan.count({
        where: {
          plan: baseWhere,
        },
      }),
    ]);

    const statusMap = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalPlans: Object.values(statusMap).reduce((a, b) => a + b, 0),
      activePlans: statusMap[SubscriptionPlanStatus.ACTIVE] || 0,
      draftPlans: statusMap[SubscriptionPlanStatus.DRAFT] || 0,
      archivedPlans: statusMap[SubscriptionPlanStatus.ARCHIVED] || 0,
      byScope: scopeCounts.map((item) => ({
        scope: item.scope,
        count: item._count._all,
      })),
      totalProductAssignments: productAssignments,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new subscription plan
   */
  async create(dto: CreateSubscriptionPlanDto, userId?: string): Promise<SubscriptionPlan> {
    // Validate scope ownership
    this.validateScopeOwnership(dto);

    // Check for duplicate name within scope
    await this.checkDuplicateName(dto.scope, dto.name, this.getScopeId(dto));

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        scope: dto.scope,
        organizationId: dto.organizationId,
        clientId: dto.clientId,
        companyId: dto.companyId,
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        shortDescription: dto.shortDescription,
        basePriceMonthly: dto.basePriceMonthly,
        basePriceAnnual: dto.basePriceAnnual,
        annualDiscountPct: dto.annualDiscountPct,
        currency: dto.currency || 'USD',
        availableIntervals: dto.availableIntervals || ['MONTHLY'],
        defaultInterval: dto.defaultInterval || 'MONTHLY',

        // Trial
        trialEnabled: dto.trialEnabled ?? false,
        trialDays: dto.trialDays,
        trialIncludesShipment: dto.trialIncludesShipment ?? false,
        trialStartTrigger: dto.trialStartTrigger || 'ON_PURCHASE',
        trialConversionTrigger: dto.trialConversionTrigger || 'ON_PURCHASE',
        trialWaitForDelivery: dto.trialWaitForDelivery ?? false,
        trialExtendDaysPostDelivery: dto.trialExtendDaysPostDelivery ?? 0,
        trialNoTrackingFallbackDays: dto.trialNoTrackingFallbackDays,
        trialReturnAction: dto.trialReturnAction || 'PAUSE_ALERT',
        trialReturnExtendDays: dto.trialReturnExtendDays,

        // Recurring
        recurringEnabled: dto.recurringEnabled ?? true,
        recurringIntervalDays: dto.recurringIntervalDays,
        recurringIncludesShipment: dto.recurringIncludesShipment ?? true,
        recurringTrigger: dto.recurringTrigger || 'ON_PURCHASE',
        recurringWaitForDelivery: dto.recurringWaitForDelivery ?? false,
        recurringExtendDaysPostDelivery: dto.recurringExtendDaysPostDelivery ?? 0,

        // Shipment
        partialShipmentAction: dto.partialShipmentAction || 'PROCEED',
        backorderAction: dto.backorderAction || 'DELAY_CHARGE',
        shippingCostAction: dto.shippingCostAction || 'ABSORB_COST',
        gracePeriodDays: dto.gracePeriodDays,

        // Pause & Skip
        pauseEnabled: dto.pauseEnabled ?? true,
        pauseMaxDuration: dto.pauseMaxDuration,
        skipEnabled: dto.skipEnabled ?? true,
        skipMaxPerYear: dto.skipMaxPerYear,

        // Quantity
        includedQuantity: dto.includedQuantity ?? 1,
        maxQuantity: dto.maxQuantity,
        quantityChangeProrate: dto.quantityChangeProrate ?? true,

        // Loyalty
        loyaltyEnabled: dto.loyaltyEnabled ?? false,
        loyaltyTiers: dto.loyaltyTiers as any,
        loyaltyStackable: dto.loyaltyStackable ?? false,

        // Price lock & early renewal
        priceLockEnabled: dto.priceLockEnabled ?? false,
        priceLockCycles: dto.priceLockCycles,
        earlyRenewalEnabled: dto.earlyRenewalEnabled ?? false,
        earlyRenewalProrate: dto.earlyRenewalProrate ?? true,

        // Retention
        downsellPlanId: dto.downsellPlanId,
        winbackEnabled: dto.winbackEnabled ?? false,
        winbackDiscountPct: dto.winbackDiscountPct,
        winbackTrialDays: dto.winbackTrialDays,

        // Gifting
        giftingEnabled: dto.giftingEnabled ?? false,
        giftDurationDefault: dto.giftDurationDefault || 'ONGOING',
        giftFixedCycles: dto.giftFixedCycles,

        // Bundle
        bundleType: dto.bundleType,
        bundleMinProducts: dto.bundleMinProducts,
        bundleMaxProducts: dto.bundleMaxProducts,

        // Notifications
        notifyRenewalEnabled: dto.notifyRenewalEnabled ?? false,
        notifyRenewalDaysBefore: dto.notifyRenewalDaysBefore ?? 3,

        // Display
        sortOrder: dto.sortOrder ?? 0,
        isPublic: dto.isPublic ?? true,
        isFeatured: dto.isFeatured ?? false,
        badgeText: dto.badgeText,
        features: dto.features || [],

        // Metadata
        metadata: (dto.metadata || {}) as any,

        // Status
        status: SubscriptionPlanStatus.DRAFT,
        createdBy: userId,
      },
      include: {
        _count: {
          select: { productPlans: true },
        },
      },
    });

    this.logger.log(
      `Created subscription plan: ${plan.name} (${plan.scope}:${this.getScopeId(dto)})`,
    );
    this.eventEmitter.emit('subscription-plan.created', { plan });

    return this.mapToPlan(plan);
  }

  /**
   * Update a subscription plan
   */
  async update(
    id: string,
    dto: UpdateSubscriptionPlanDto,
    userId?: string,
  ): Promise<SubscriptionPlan> {
    const existing = await this.findById(id);

    // Check name uniqueness if changing
    if (dto.name && dto.name !== existing.name) {
      await this.checkDuplicateName(
        existing.scope,
        dto.name,
        existing.organizationId || existing.clientId || existing.companyId,
        id,
      );
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...this.buildUpdateData(dto),
        updatedBy: userId,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: { productPlans: true },
        },
        downsellPlan: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    this.logger.log(`Updated subscription plan: ${plan.name}`);
    this.eventEmitter.emit('subscription-plan.updated', { plan, previousData: existing });

    return this.mapToPlan(plan);
  }

  /**
   * Publish a plan (change status from DRAFT to ACTIVE)
   */
  async publish(id: string, userId?: string): Promise<SubscriptionPlan> {
    const existing = await this.findById(id);

    if (existing.status !== SubscriptionPlanStatus.DRAFT) {
      throw new BadRequestException('Only draft plans can be published');
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        status: SubscriptionPlanStatus.ACTIVE,
        publishedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: { productPlans: true },
        },
      },
    });

    this.logger.log(`Published subscription plan: ${plan.name}`);
    this.eventEmitter.emit('subscription-plan.published', { plan });

    return this.mapToPlan(plan);
  }

  /**
   * Archive a plan
   */
  async archive(id: string, userId?: string): Promise<SubscriptionPlan> {
    const existing = await this.findById(id);

    if (existing.status === SubscriptionPlanStatus.ARCHIVED) {
      throw new BadRequestException('Plan is already archived');
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        status: SubscriptionPlanStatus.ARCHIVED,
        archivedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: { productPlans: true },
        },
      },
    });

    this.logger.log(`Archived subscription plan: ${plan.name}`);
    this.eventEmitter.emit('subscription-plan.archived', { plan });

    return this.mapToPlan(plan);
  }

  /**
   * Soft delete a plan
   */
  async delete(id: string, userId?: string): Promise<void> {
    const existing = await this.findById(id);

    // Check if plan is attached to any products
    if (existing.productPlansCount && existing.productPlansCount > 0) {
      throw new BadRequestException(
        `Cannot delete plan that is attached to ${existing.productPlansCount} products. Remove product assignments first.`,
      );
    }

    await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    this.logger.log(`Deleted subscription plan: ${existing.name}`);
    this.eventEmitter.emit('subscription-plan.deleted', { plan: existing });
  }

  /**
   * Duplicate a plan
   */
  async duplicate(
    id: string,
    newName: string,
    userId?: string,
  ): Promise<SubscriptionPlan> {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    // Remove id, timestamps, and status fields
    const { id: _, createdAt, updatedAt, publishedAt, archivedAt, deletedAt, deletedBy, cascadeId, createdBy, updatedBy, ...planData } = existing;

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        ...planData,
        name: newName,
        displayName: `${existing.displayName} (Copy)`,
        status: SubscriptionPlanStatus.DRAFT,
        createdBy: userId,
      },
      include: {
        _count: {
          select: { productPlans: true },
        },
      },
    });

    this.logger.log(`Duplicated subscription plan: ${existing.name} -> ${plan.name}`);
    this.eventEmitter.emit('subscription-plan.duplicated', { plan, originalId: id });

    return this.mapToPlan(plan);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT-PLAN ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Attach a plan to a product
   */
  async attachToProduct(dto: AttachPlanToProductDto): Promise<ProductSubscriptionPlan> {
    // Verify plan exists and is active
    const plan = await this.findById(dto.planId);
    if (plan.status !== SubscriptionPlanStatus.ACTIVE) {
      throw new BadRequestException('Can only attach active plans to products');
    }

    // Check if already attached
    const existing = await this.prisma.productSubscriptionPlan.findUnique({
      where: {
        productId_planId: {
          productId: dto.productId,
          planId: dto.planId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Plan is already attached to this product');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.productSubscriptionPlan.updateMany({
        where: { productId: dto.productId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const productPlan = await this.prisma.productSubscriptionPlan.create({
      data: {
        productId: dto.productId,
        planId: dto.planId,
        overridePriceMonthly: dto.overridePriceMonthly,
        overridePriceAnnual: dto.overridePriceAnnual,
        overrideTrialDays: dto.overrideTrialDays,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        plan: {
          include: {
            _count: {
              select: { productPlans: true },
            },
          },
        },
      },
    });

    this.logger.log(`Attached plan ${dto.planId} to product ${dto.productId}`);
    this.eventEmitter.emit('product-plan.attached', { productPlan });

    return this.mapToProductPlan(productPlan);
  }

  /**
   * Update a product-plan assignment
   */
  async updateProductPlan(
    productId: string,
    planId: string,
    dto: UpdateProductPlanDto,
  ): Promise<ProductSubscriptionPlan> {
    const existing = await this.prisma.productSubscriptionPlan.findUnique({
      where: {
        productId_planId: { productId, planId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product-plan assignment not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.productSubscriptionPlan.updateMany({
        where: {
          productId,
          isDefault: true,
          NOT: { planId },
        },
        data: { isDefault: false },
      });
    }

    const productPlan = await this.prisma.productSubscriptionPlan.update({
      where: {
        productId_planId: { productId, planId },
      },
      data: {
        overridePriceMonthly: dto.overridePriceMonthly,
        overridePriceAnnual: dto.overridePriceAnnual,
        overrideTrialDays: dto.overrideTrialDays,
        isDefault: dto.isDefault,
        sortOrder: dto.sortOrder,
      },
      include: {
        plan: {
          include: {
            _count: {
              select: { productPlans: true },
            },
          },
        },
      },
    });

    return this.mapToProductPlan(productPlan);
  }

  /**
   * Detach a plan from a product
   */
  async detachFromProduct(productId: string, planId: string): Promise<void> {
    const existing = await this.prisma.productSubscriptionPlan.findUnique({
      where: {
        productId_planId: { productId, planId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product-plan assignment not found');
    }

    await this.prisma.productSubscriptionPlan.delete({
      where: {
        productId_planId: { productId, planId },
      },
    });

    this.logger.log(`Detached plan ${planId} from product ${productId}`);
    this.eventEmitter.emit('product-plan.detached', { productId, planId });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private buildWhereClause(query: SubscriptionPlanQueryDto): any {
    const where: any = {
      deletedAt: null,
    };

    // Scope filtering
    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    // Status filtering
    if (query.status) {
      where.status = query.status;
    } else if (!query.includeArchived) {
      where.status = { not: SubscriptionPlanStatus.ARCHIVED };
    }

    // Public filtering
    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }

    // Search
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { displayName: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private validateScopeOwnership(dto: CreateSubscriptionPlanDto): void {
    switch (dto.scope) {
      case SubscriptionPlanScope.ORGANIZATION:
        if (!dto.organizationId) {
          throw new BadRequestException('organizationId is required for ORGANIZATION scope');
        }
        if (dto.clientId || dto.companyId) {
          throw new BadRequestException('Only organizationId should be set for ORGANIZATION scope');
        }
        break;

      case SubscriptionPlanScope.CLIENT:
        if (!dto.clientId) {
          throw new BadRequestException('clientId is required for CLIENT scope');
        }
        if (dto.organizationId || dto.companyId) {
          throw new BadRequestException('Only clientId should be set for CLIENT scope');
        }
        break;

      case SubscriptionPlanScope.COMPANY:
        if (!dto.companyId) {
          throw new BadRequestException('companyId is required for COMPANY scope');
        }
        if (dto.organizationId || dto.clientId) {
          throw new BadRequestException('Only companyId should be set for COMPANY scope');
        }
        break;

      default:
        throw new BadRequestException('Invalid scope');
    }
  }

  private getScopeId(dto: { organizationId?: string; clientId?: string; companyId?: string }): string | null {
    return dto.organizationId || dto.clientId || dto.companyId || null;
  }

  private async checkDuplicateName(
    scope: SubscriptionPlanScope,
    name: string,
    scopeId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const where: any = {
      scope,
      name,
      deletedAt: null,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    switch (scope) {
      case SubscriptionPlanScope.ORGANIZATION:
        where.organizationId = scopeId;
        break;
      case SubscriptionPlanScope.CLIENT:
        where.clientId = scopeId;
        break;
      case SubscriptionPlanScope.COMPANY:
        where.companyId = scopeId;
        break;
    }

    const existing = await this.prisma.subscriptionPlan.findFirst({ where });
    if (existing) {
      throw new ConflictException(`A plan named "${name}" already exists in this scope`);
    }
  }

  private buildUpdateData(dto: UpdateSubscriptionPlanDto): any {
    const data: any = {};

    // Only include fields that are explicitly set
    const fields = [
      'name', 'displayName', 'description', 'shortDescription',
      'basePriceMonthly', 'basePriceAnnual', 'annualDiscountPct', 'currency',
      'availableIntervals', 'defaultInterval',
      'trialEnabled', 'trialDays', 'trialIncludesShipment', 'trialStartTrigger',
      'trialConversionTrigger', 'trialWaitForDelivery', 'trialExtendDaysPostDelivery',
      'trialNoTrackingFallbackDays', 'trialReturnAction', 'trialReturnExtendDays',
      'recurringEnabled', 'recurringIntervalDays', 'recurringIncludesShipment',
      'recurringTrigger', 'recurringWaitForDelivery', 'recurringExtendDaysPostDelivery',
      'partialShipmentAction', 'backorderAction', 'shippingCostAction', 'gracePeriodDays',
      'pauseEnabled', 'pauseMaxDuration', 'skipEnabled', 'skipMaxPerYear',
      'includedQuantity', 'maxQuantity', 'quantityChangeProrate',
      'loyaltyEnabled', 'loyaltyTiers', 'loyaltyStackable',
      'priceLockEnabled', 'priceLockCycles', 'earlyRenewalEnabled', 'earlyRenewalProrate',
      'downsellPlanId', 'winbackEnabled', 'winbackDiscountPct', 'winbackTrialDays',
      'giftingEnabled', 'giftDurationDefault', 'giftFixedCycles',
      'bundleType', 'bundleMinProducts', 'bundleMaxProducts',
      'notifyRenewalEnabled', 'notifyRenewalDaysBefore',
      'sortOrder', 'isPublic', 'isFeatured', 'badgeText', 'features',
      'metadata', 'status',
    ];

    for (const field of fields) {
      if ((dto as any)[field] !== undefined) {
        data[field] = (dto as any)[field];
      }
    }

    return data;
  }

  private mapToPlan(data: any): SubscriptionPlan {
    return {
      id: data.id,
      scope: data.scope,
      organizationId: data.organizationId,
      clientId: data.clientId,
      companyId: data.companyId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      shortDescription: data.shortDescription,
      basePriceMonthly: Number(data.basePriceMonthly),
      basePriceAnnual: data.basePriceAnnual ? Number(data.basePriceAnnual) : null,
      annualDiscountPct: data.annualDiscountPct ? Number(data.annualDiscountPct) : null,
      currency: data.currency,
      availableIntervals: data.availableIntervals,
      defaultInterval: data.defaultInterval,
      trialEnabled: data.trialEnabled,
      trialDays: data.trialDays,
      trialIncludesShipment: data.trialIncludesShipment,
      trialStartTrigger: data.trialStartTrigger,
      trialConversionTrigger: data.trialConversionTrigger,
      trialWaitForDelivery: data.trialWaitForDelivery,
      trialExtendDaysPostDelivery: data.trialExtendDaysPostDelivery,
      trialNoTrackingFallbackDays: data.trialNoTrackingFallbackDays,
      trialReturnAction: data.trialReturnAction,
      trialReturnExtendDays: data.trialReturnExtendDays,
      recurringEnabled: data.recurringEnabled,
      recurringIntervalDays: data.recurringIntervalDays,
      recurringIncludesShipment: data.recurringIncludesShipment,
      recurringTrigger: data.recurringTrigger,
      recurringWaitForDelivery: data.recurringWaitForDelivery,
      recurringExtendDaysPostDelivery: data.recurringExtendDaysPostDelivery,
      partialShipmentAction: data.partialShipmentAction,
      backorderAction: data.backorderAction,
      shippingCostAction: data.shippingCostAction,
      gracePeriodDays: data.gracePeriodDays,
      pauseEnabled: data.pauseEnabled,
      pauseMaxDuration: data.pauseMaxDuration,
      skipEnabled: data.skipEnabled,
      skipMaxPerYear: data.skipMaxPerYear,
      includedQuantity: data.includedQuantity,
      maxQuantity: data.maxQuantity,
      quantityChangeProrate: data.quantityChangeProrate,
      loyaltyEnabled: data.loyaltyEnabled,
      loyaltyTiers: data.loyaltyTiers as LoyaltyTier[] | null,
      loyaltyStackable: data.loyaltyStackable,
      priceLockEnabled: data.priceLockEnabled,
      priceLockCycles: data.priceLockCycles,
      earlyRenewalEnabled: data.earlyRenewalEnabled,
      earlyRenewalProrate: data.earlyRenewalProrate,
      downsellPlanId: data.downsellPlanId,
      winbackEnabled: data.winbackEnabled,
      winbackDiscountPct: data.winbackDiscountPct ? Number(data.winbackDiscountPct) : null,
      winbackTrialDays: data.winbackTrialDays,
      giftingEnabled: data.giftingEnabled,
      giftDurationDefault: data.giftDurationDefault,
      giftFixedCycles: data.giftFixedCycles,
      bundleType: data.bundleType,
      bundleMinProducts: data.bundleMinProducts,
      bundleMaxProducts: data.bundleMaxProducts,
      notifyRenewalEnabled: data.notifyRenewalEnabled,
      notifyRenewalDaysBefore: data.notifyRenewalDaysBefore,
      sortOrder: data.sortOrder,
      isPublic: data.isPublic,
      isFeatured: data.isFeatured,
      badgeText: data.badgeText,
      features: data.features as string[],
      metadata: data.metadata as Record<string, unknown>,
      status: data.status,
      publishedAt: data.publishedAt,
      archivedAt: data.archivedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      deletedAt: data.deletedAt,
      deletedBy: data.deletedBy,
      downsellPlan: data.downsellPlan ? this.mapToPlan(data.downsellPlan) : undefined,
      productPlansCount: data._count?.productPlans,
    };
  }

  private mapToProductPlan(data: any): ProductSubscriptionPlan {
    return {
      id: data.id,
      productId: data.productId,
      planId: data.planId,
      overridePriceMonthly: data.overridePriceMonthly ? Number(data.overridePriceMonthly) : null,
      overridePriceAnnual: data.overridePriceAnnual ? Number(data.overridePriceAnnual) : null,
      overrideTrialDays: data.overrideTrialDays,
      isDefault: data.isDefault,
      sortOrder: data.sortOrder,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      plan: data.plan ? this.mapToPlan(data.plan) : undefined,
    };
  }
}
