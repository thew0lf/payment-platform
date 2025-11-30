import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { PriceRuleType, AdjustmentType, Prisma } from '@prisma/client';
import {
  CreatePriceRuleDto,
  UpdatePriceRuleDto,
  CalculatePriceDto,
} from '../dto/price-rule.dto';

export interface ProductPriceRule {
  id: string;
  productId: string;
  name: string;
  type: PriceRuleType;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  customerGroupId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalculatedPrice {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountPercent: number;
  appliedRules: Array<{
    id: string;
    name: string;
    type: PriceRuleType;
    adjustment: number;
  }>;
}

@Injectable()
export class PriceRuleService {
  private readonly logger = new Logger(PriceRuleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Validate user has access to the product's company
   */
  private async validateProductAccess(
    user: UserContext,
    productId: string,
  ): Promise<{ product: { id: string; companyId: string; price: Prisma.Decimal } }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, companyId: true, price: true },
    });

    if (!product || product.companyId === null) {
      throw new NotFoundException('Product not found');
    }

    const hasAccess = await this.hierarchyService.canAccessCompany(user, product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this product');
    }

    return { product: product as { id: string; companyId: string; price: Prisma.Decimal } };
  }

  /**
   * List all price rules for a product
   */
  async listRules(
    productId: string,
    user: UserContext,
    activeOnly = false,
  ): Promise<ProductPriceRule[]> {
    await this.validateProductAccess(user, productId);

    const where: Prisma.ProductPriceRuleWhereInput = { productId };
    if (activeOnly) {
      where.isActive = true;
    }

    const rules = await this.prisma.productPriceRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return rules.map((rule) => ({
      ...rule,
      adjustmentValue: Number(rule.adjustmentValue),
    }));
  }

  /**
   * Create a new price rule
   */
  async createRule(
    productId: string,
    dto: CreatePriceRuleDto,
    user: UserContext,
  ): Promise<ProductPriceRule> {
    await this.validateProductAccess(user, productId);

    const rule = await this.prisma.productPriceRule.create({
      data: {
        productId,
        name: dto.name,
        type: dto.type,
        adjustmentType: dto.adjustmentType,
        adjustmentValue: dto.adjustmentValue,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        customerGroupId: dto.customerGroupId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Created price rule ${rule.id} for product ${productId}`);

    return {
      ...rule,
      adjustmentValue: Number(rule.adjustmentValue),
    };
  }

  /**
   * Update an existing price rule
   */
  async updateRule(
    productId: string,
    ruleId: string,
    dto: UpdatePriceRuleDto,
    user: UserContext,
  ): Promise<ProductPriceRule> {
    await this.validateProductAccess(user, productId);

    const existingRule = await this.prisma.productPriceRule.findFirst({
      where: { id: ruleId, productId },
    });

    if (!existingRule) {
      throw new NotFoundException('Price rule not found');
    }

    const rule = await this.prisma.productPriceRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name,
        type: dto.type,
        adjustmentType: dto.adjustmentType,
        adjustmentValue: dto.adjustmentValue,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        customerGroupId: dto.customerGroupId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Updated price rule ${ruleId}`);

    return {
      ...rule,
      adjustmentValue: Number(rule.adjustmentValue),
    };
  }

  /**
   * Delete a price rule
   */
  async deleteRule(
    productId: string,
    ruleId: string,
    user: UserContext,
  ): Promise<void> {
    await this.validateProductAccess(user, productId);

    const existingRule = await this.prisma.productPriceRule.findFirst({
      where: { id: ruleId, productId },
    });

    if (!existingRule) {
      throw new NotFoundException('Price rule not found');
    }

    await this.prisma.productPriceRule.delete({
      where: { id: ruleId },
    });

    this.logger.log(`Deleted price rule ${ruleId}`);
  }

  /**
   * Calculate the final price for a product applying all relevant rules
   */
  async calculatePrice(
    productId: string,
    dto: CalculatePriceDto,
    user: UserContext,
  ): Promise<CalculatedPrice> {
    const { product } = await this.validateProductAccess(user, productId);

    const basePrice = Number(product.price);
    const now = new Date();

    // Get all applicable active rules
    const rules = await this.prisma.productPriceRule.findMany({
      where: {
        productId,
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    const appliedRules: CalculatedPrice['appliedRules'] = [];
    let finalPrice = basePrice;

    // Track which rule types have been applied (for priority-based exclusion)
    const appliedTypes = new Set<PriceRuleType>();

    for (const rule of rules) {
      // Skip if we've already applied a rule of this type (highest priority wins)
      if (appliedTypes.has(rule.type)) continue;

      // Check quantity constraints
      if (dto.quantity !== undefined) {
        if (rule.minQuantity && dto.quantity < rule.minQuantity) continue;
        if (rule.maxQuantity && dto.quantity > rule.maxQuantity) continue;
      }

      // Check customer group constraint
      if (rule.customerGroupId && dto.customerGroupId !== rule.customerGroupId) continue;

      // Calculate adjustment
      const adjustmentValue = Number(rule.adjustmentValue);
      let adjustment = 0;

      switch (rule.adjustmentType) {
        case 'FIXED_AMOUNT':
          adjustment = adjustmentValue;
          finalPrice = Math.max(0, finalPrice - adjustment);
          break;
        case 'PERCENTAGE':
          adjustment = finalPrice * (adjustmentValue / 100);
          finalPrice = Math.max(0, finalPrice - adjustment);
          break;
        case 'FIXED_PRICE':
          adjustment = finalPrice - adjustmentValue;
          finalPrice = Math.max(0, adjustmentValue);
          break;
      }

      appliedRules.push({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        adjustment: Math.round(adjustment * 100) / 100,
      });

      appliedTypes.add(rule.type);
    }

    const discount = basePrice - finalPrice;
    const discountPercent = basePrice > 0 ? (discount / basePrice) * 100 : 0;

    return {
      originalPrice: Math.round(basePrice * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      discountPercent: Math.round(discountPercent * 10) / 10,
      appliedRules,
    };
  }
}
