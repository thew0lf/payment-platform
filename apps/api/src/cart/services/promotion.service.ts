import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PromotionType, PromotionScope, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface PromotionValidationResult {
  valid: boolean;
  promotion?: PromotionData;
  error?: string;
  discountAmount?: Decimal;
}

export interface PromotionData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  scope: PromotionScope;
  value: Decimal;
  minimumOrderAmount: Decimal | null;
  maximumDiscount: Decimal | null;
}

export interface ApplyPromotionInput {
  cartId: string;
  code: string;
  companyId: string;
  customerId?: string;
  cartSubtotal: Decimal;
  cartItems: {
    productId: string;
    categoryId?: string;
    quantity: number;
    lineTotal: Decimal;
  }[];
}

export interface PromotionCalculationResult {
  discountAmount: Decimal;
  appliedToItems: {
    productId: string;
    discountAmount: Decimal;
  }[];
  message: string;
}

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new promotion
   */
  async createPromotion(
    companyId: string,
    data: {
      code: string;
      name: string;
      description?: string;
      type: PromotionType;
      scope: PromotionScope;
      value: number;
      minimumOrderAmount?: number;
      maximumDiscount?: number;
      buyQuantity?: number;
      getQuantity?: number;
      getProductId?: string;
      maxUsesTotal?: number;
      maxUsesPerCustomer?: number;
      startsAt: Date;
      expiresAt?: Date;
      targeting?: Record<string, unknown>;
    },
  ) {
    // Validate value is positive
    if (data.value < 0) {
      throw new BadRequestException('Oops! The promotion value needs to be a positive number.');
    }

    // Validate percentage doesn't exceed 100
    if (data.type === PromotionType.PERCENTAGE_OFF && data.value > 100) {
      throw new BadRequestException('Whoa there! A percentage discount can\'t exceed 100%.');
    }

    // Validate code is unique for this company
    const existing = await this.prisma.promotion.findUnique({
      where: { companyId_code: { companyId, code: data.code.toUpperCase() } },
    });

    if (existing) {
      throw new BadRequestException(`The code "${data.code}" is already taken. Try a different one!`);
    }

    return this.prisma.promotion.create({
      data: {
        companyId,
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        type: data.type,
        scope: data.scope,
        value: new Decimal(data.value),
        minimumOrderAmount: data.minimumOrderAmount ? new Decimal(data.minimumOrderAmount) : null,
        maximumDiscount: data.maximumDiscount ? new Decimal(data.maximumDiscount) : null,
        buyQuantity: data.buyQuantity,
        getQuantity: data.getQuantity,
        getProductId: data.getProductId,
        maxUsesTotal: data.maxUsesTotal,
        maxUsesPerCustomer: data.maxUsesPerCustomer,
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
        targeting: (data.targeting || {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Validate and calculate discount for a promotion code
   */
  async validatePromotion(input: ApplyPromotionInput): Promise<PromotionValidationResult> {
    const { code, companyId, customerId, cartSubtotal, cartItems } = input;

    // Find the promotion
    const promotion = await this.prisma.promotion.findUnique({
      where: { companyId_code: { companyId, code: code.toUpperCase() } },
    });

    if (!promotion) {
      return { valid: false, error: 'Invalid promotion code' };
    }

    // Check if active
    if (!promotion.isActive) {
      return { valid: false, error: 'This promotion is no longer active' };
    }

    // Check validity period
    const now = new Date();
    if (now < promotion.startsAt) {
      return { valid: false, error: 'This promotion has not started yet' };
    }
    if (promotion.expiresAt && now > promotion.expiresAt) {
      return { valid: false, error: 'This promotion has expired' };
    }

    // Check minimum order amount
    if (promotion.minimumOrderAmount && cartSubtotal.lessThan(promotion.minimumOrderAmount)) {
      return {
        valid: false,
        error: `Minimum order of $${promotion.minimumOrderAmount.toFixed(2)} required`,
      };
    }

    // Check total usage limit
    if (promotion.maxUsesTotal && promotion.currentUses >= promotion.maxUsesTotal) {
      return { valid: false, error: 'This promotion has reached its usage limit' };
    }

    // Check per-customer usage limit
    if (promotion.maxUsesPerCustomer && customerId) {
      const customerUsage = await this.prisma.promotionUsage.count({
        where: {
          promotionId: promotion.id,
          customerId,
        },
      });

      if (customerUsage >= promotion.maxUsesPerCustomer) {
        return { valid: false, error: 'You have already used this promotion' };
      }
    }

    // Check targeting (products, categories)
    const targeting = promotion.targeting as Record<string, string[]> | null;
    if (targeting) {
      const productIds = targeting.productIds || [];
      const categoryIds = targeting.categoryIds || [];
      const excludeProductIds = targeting.excludeProductIds || [];

      if (productIds.length > 0) {
        const hasValidProduct = cartItems.some((item) => productIds.includes(item.productId));
        if (!hasValidProduct) {
          return { valid: false, error: 'This promotion does not apply to items in your cart' };
        }
      }

      if (excludeProductIds.length > 0) {
        const allExcluded = cartItems.every((item) => excludeProductIds.includes(item.productId));
        if (allExcluded) {
          return { valid: false, error: 'This promotion does not apply to items in your cart' };
        }
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(promotion, cartSubtotal, cartItems);

    return {
      valid: true,
      promotion: {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        description: promotion.description,
        type: promotion.type,
        scope: promotion.scope,
        value: promotion.value,
        minimumOrderAmount: promotion.minimumOrderAmount,
        maximumDiscount: promotion.maximumDiscount,
      },
      discountAmount,
    };
  }

  /**
   * Calculate the discount amount for a promotion
   */
  private calculateDiscount(
    promotion: {
      type: PromotionType;
      scope: PromotionScope;
      value: Decimal;
      maximumDiscount: Decimal | null;
      buyQuantity: number | null;
      getQuantity: number | null;
    },
    cartSubtotal: Decimal,
    cartItems: { productId: string; quantity: number; lineTotal: Decimal }[],
  ): Decimal {
    let discount = new Decimal(0);

    switch (promotion.type) {
      case PromotionType.PERCENTAGE_OFF:
        if (promotion.scope === PromotionScope.CART) {
          // Apply percentage to entire cart
          discount = cartSubtotal.times(promotion.value).dividedBy(100);
        } else {
          // Apply to specific items (simplified - would need targeting logic)
          discount = cartSubtotal.times(promotion.value).dividedBy(100);
        }
        break;

      case PromotionType.FIXED_AMOUNT_OFF:
        discount = promotion.value;
        break;

      case PromotionType.FREE_SHIPPING:
        // This is handled separately in shipping calculation
        discount = new Decimal(0);
        break;

      case PromotionType.BUY_X_GET_Y:
        // Calculate BOGO discount
        if (promotion.buyQuantity && promotion.getQuantity) {
          const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
          const sets = Math.floor(totalQuantity / (promotion.buyQuantity + promotion.getQuantity));
          // Assume free items are lowest priced (simplified)
          const avgPrice = cartSubtotal.dividedBy(totalQuantity);
          discount = avgPrice.times(sets * promotion.getQuantity);
        }
        break;

      case PromotionType.FREE_GIFT:
        // Free gift doesn't reduce cart total directly
        discount = new Decimal(0);
        break;
    }

    // Apply maximum discount cap
    if (promotion.maximumDiscount && discount.greaterThan(promotion.maximumDiscount)) {
      discount = promotion.maximumDiscount;
    }

    // Ensure discount doesn't exceed cart total
    if (discount.greaterThan(cartSubtotal)) {
      discount = cartSubtotal;
    }

    return discount;
  }

  /**
   * Apply a promotion to a cart
   */
  async applyPromotion(input: ApplyPromotionInput): Promise<PromotionCalculationResult> {
    const validation = await this.validatePromotion(input);

    if (!validation.valid || !validation.promotion) {
      throw new BadRequestException(validation.error || 'Hmm, that promotion code didn\'t work. Try another one!');
    }

    const { promotion, discountAmount } = validation;

    // Record the cart-promotion application
    await this.prisma.cartPromotion.upsert({
      where: {
        cartId_promotionId: {
          cartId: input.cartId,
          promotionId: promotion.id,
        },
      },
      create: {
        cartId: input.cartId,
        promotionId: promotion.id,
        discountAmount: discountAmount!,
      },
      update: {
        discountAmount: discountAmount!,
        appliedAt: new Date(),
      },
    });

    this.logger.log(`Applied promotion ${promotion.code} to cart ${input.cartId}, discount: $${discountAmount?.toFixed(2)}`);

    return {
      discountAmount: discountAmount!,
      appliedToItems: [], // Would include item-level breakdown
      message: `Promotion ${promotion.code} applied: $${discountAmount?.toFixed(2)} off`,
    };
  }

  /**
   * Remove a promotion from a cart
   */
  async removePromotion(cartId: string, promotionId: string): Promise<void> {
    await this.prisma.cartPromotion.deleteMany({
      where: { cartId, promotionId },
    });
  }

  /**
   * Record promotion usage after order completion
   */
  async recordUsage(
    promotionId: string,
    orderId: string,
    customerId: string | undefined,
    discountAmount: Decimal,
  ): Promise<void> {
    await this.prisma.$transaction([
      // Create usage record
      this.prisma.promotionUsage.create({
        data: {
          promotionId,
          orderId,
          customerId,
          discountAmount,
        },
      }),
      // Increment usage counter
      this.prisma.promotion.update({
        where: { id: promotionId },
        data: { currentUses: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Get promotions for a company
   */
  async getPromotions(
    companyId: string,
    options?: {
      isActive?: boolean;
      includeExpired?: boolean;
    },
  ) {
    const where: Prisma.PromotionWhereInput = { companyId };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (!options?.includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ];
    }

    return this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single promotion by ID
   */
  async getPromotionById(id: string, companyId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, companyId },
      include: {
        usageRecords: {
          take: 10,
          orderBy: { appliedAt: 'desc' },
        },
      },
    });

    if (!promotion) {
      throw new NotFoundException('We couldn\'t find that promotion. It may have been removed or expired.');
    }

    return promotion;
  }

  /**
   * Update a promotion
   */
  async updatePromotion(
    id: string,
    companyId: string,
    data: Partial<{
      name: string;
      description: string;
      value: number;
      minimumOrderAmount: number;
      maximumDiscount: number;
      maxUsesTotal: number;
      maxUsesPerCustomer: number;
      startsAt: Date;
      expiresAt: Date;
      targeting: Record<string, unknown>;
      isActive: boolean;
    }>,
  ) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, companyId },
    });

    if (!promotion) {
      throw new NotFoundException('We couldn\'t find that promotion. It may have been removed or expired.');
    }

    // Extract targeting and other fields that need special handling
    const { targeting, value, minimumOrderAmount, maximumDiscount, ...rest } = data;

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...rest,
        ...(value !== undefined && { value: new Decimal(value) }),
        ...(minimumOrderAmount !== undefined && { minimumOrderAmount: new Decimal(minimumOrderAmount) }),
        ...(maximumDiscount !== undefined && { maximumDiscount: new Decimal(maximumDiscount) }),
        ...(targeting !== undefined && { targeting: targeting as Prisma.InputJsonValue }),
      },
    });
  }

  /**
   * Delete a promotion
   */
  async deletePromotion(id: string, companyId: string): Promise<void> {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, companyId },
    });

    if (!promotion) {
      throw new NotFoundException('We couldn\'t find that promotion. It may have been removed or expired.');
    }

    // Check if promotion has been used
    const usageCount = await this.prisma.promotionUsage.count({
      where: { promotionId: id },
    });

    if (usageCount > 0) {
      // Soft delete by deactivating
      await this.prisma.promotion.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if never used
      await this.prisma.promotion.delete({
        where: { id },
      });
    }
  }

  /**
   * Check if a promotion provides free shipping
   */
  hasFreeShipping(promotionId: string): Promise<boolean> {
    return this.prisma.promotion.findFirst({
      where: {
        id: promotionId,
        type: PromotionType.FREE_SHIPPING,
        isActive: true,
      },
    }).then((p) => !!p);
  }
}
