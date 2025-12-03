/**
 * Multi-Product Subscription Service
 *
 * Handles subscriptions with multiple products (subscription boxes):
 * - Product bundles and curated boxes
 * - Product swapping and customization
 * - Bundle pricing and discounts
 * - Build-your-own-box functionality
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Subscription,
  SubscriptionItem,
  SubscriptionPlan,
  Product,
  Prisma,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum BoxType {
  CURATED = 'CURATED',           // Company-curated selection
  BUILD_YOUR_OWN = 'BUILD_YOUR_OWN', // Customer picks products
  SURPRISE = 'SURPRISE',         // Random/surprise selection
  HYBRID = 'HYBRID',             // Mix of curated and customer choice
}

export enum SwapStatus {
  ALLOWED = 'ALLOWED',
  NOT_ALLOWED = 'NOT_ALLOWED',
  DEADLINE_PASSED = 'DEADLINE_PASSED',
  ALREADY_SHIPPED = 'ALREADY_SHIPPED',
}

export interface BoxConfiguration {
  planId: string;
  boxType: BoxType;

  // Limits
  minItems: number;
  maxItems: number;
  maxQuantityPerItem: number;

  // Pricing
  bundleDiscountPct: number;
  freeItemsIncluded: number;

  // Customization
  allowSwaps: boolean;
  swapDeadlineDays: number; // Days before billing to lock
  allowAddOns: boolean;
  addOnMaxValue: number;

  // Categories
  requiredCategories?: string[];
  excludedCategories?: string[];
}

export interface BoxProduct {
  productId: string;
  quantity: number;
  isSwappable: boolean;
  isRequired: boolean;
  addedPrice?: number; // Extra cost for premium items
}

export interface SwapProductDto {
  subscriptionId: string;
  oldProductId: string;
  newProductId: string;
  quantity?: number;
}

export interface AddItemDto {
  subscriptionId: string;
  productId: string;
  quantity: number;
  isAddOn?: boolean;
}

export interface RemoveItemDto {
  subscriptionId: string;
  productId: string;
}

export interface BuildBoxDto {
  subscriptionId: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface BoxPreview {
  subscriptionId: string;
  planId: string;
  boxType: BoxType;
  items: Array<{
    product: Product;
    quantity: number;
    isSwappable: boolean;
    isRequired: boolean;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  bundleDiscount: number;
  addOnsTotal: number;
  total: number;
  canSwapUntil?: Date;
  swapStatus: SwapStatus;
}

export interface AvailableSwap {
  productId: string;
  name: string;
  sku: string;
  price: number;
  priceDifference: number;
  imageUrl?: string;
  inStock: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionMultiProductService {
  private readonly logger = new Logger(SubscriptionMultiProductService.name);

  // In-memory storage for box configurations (would be database in production)
  private boxConfigurations: Map<string, BoxConfiguration> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // BOX CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Configure box settings for a plan
   */
  async configureBox(config: BoxConfiguration): Promise<BoxConfiguration> {
    // Validate plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: config.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${config.planId} not found`);
    }

    // Validate limits
    if (config.minItems > config.maxItems) {
      throw new BadRequestException('minItems cannot exceed maxItems');
    }

    this.boxConfigurations.set(config.planId, config);

    this.eventEmitter.emit('subscription.box.configured', {
      planId: config.planId,
      boxType: config.boxType,
    });

    this.logger.log(`Box configured for plan ${config.planId}: ${config.boxType}`);

    return config;
  }

  /**
   * Get box configuration for a plan
   */
  getBoxConfiguration(planId: string): BoxConfiguration | null {
    return this.boxConfigurations.get(planId) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION ITEMS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Add item to subscription
   */
  async addItem(dto: AddItemDto): Promise<SubscriptionItem> {
    const subscription = await this.getSubscriptionWithItems(dto.subscriptionId);
    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;

    // Validate product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    // Check if product already in subscription
    const existingItem = subscription.items.find(
      (item) => item.productId === dto.productId,
    );

    if (existingItem) {
      // Update quantity instead
      return this.updateItemQuantity(
        dto.subscriptionId,
        dto.productId,
        existingItem.quantity + dto.quantity,
      );
    }

    // Validate against box configuration
    if (config) {
      const currentItemCount = subscription.items.length;
      if (currentItemCount >= config.maxItems) {
        throw new BadRequestException(
          `Maximum items (${config.maxItems}) reached for this subscription`,
        );
      }

      if (dto.quantity > config.maxQuantityPerItem) {
        throw new BadRequestException(
          `Maximum quantity per item is ${config.maxQuantityPerItem}`,
        );
      }
    }

    // Create new subscription item
    const item = await this.prisma.subscriptionItem.create({
      data: {
        subscriptionId: dto.subscriptionId,
        productId: dto.productId,
        quantity: dto.quantity,
        priceOverride: product.price,
        options: { isAddOn: dto.isAddOn || false },
      },
    });

    // Recalculate subscription total
    await this.recalculateSubscriptionTotal(dto.subscriptionId);

    this.eventEmitter.emit('subscription.item.added', {
      subscriptionId: dto.subscriptionId,
      productId: dto.productId,
      quantity: dto.quantity,
    });

    this.logger.log(
      `Item added to subscription ${dto.subscriptionId}: ${product.name} x${dto.quantity}`,
    );

    return item;
  }

  /**
   * Remove item from subscription
   */
  async removeItem(dto: RemoveItemDto): Promise<void> {
    const subscription = await this.getSubscriptionWithItems(dto.subscriptionId);
    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;

    const item = subscription.items.find(
      (i) => i.productId === dto.productId,
    );

    if (!item) {
      throw new NotFoundException('Item not found in subscription');
    }

    // Check minimum items constraint
    if (config) {
      const remainingItems = subscription.items.length - 1;
      if (remainingItems < config.minItems) {
        throw new BadRequestException(
          `Cannot remove item. Minimum ${config.minItems} items required.`,
        );
      }
    }

    await this.prisma.subscriptionItem.delete({
      where: { id: item.id },
    });

    // Recalculate subscription total
    await this.recalculateSubscriptionTotal(dto.subscriptionId);

    this.eventEmitter.emit('subscription.item.removed', {
      subscriptionId: dto.subscriptionId,
      productId: dto.productId,
    });

    this.logger.log(
      `Item removed from subscription ${dto.subscriptionId}: ${dto.productId}`,
    );
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    subscriptionId: string,
    productId: string,
    newQuantity: number,
  ): Promise<SubscriptionItem> {
    const subscription = await this.getSubscriptionWithItems(subscriptionId);
    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;

    const item = subscription.items.find(
      (i) => i.productId === productId,
    );

    if (!item) {
      throw new NotFoundException('Item not found in subscription');
    }

    if (newQuantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (config && newQuantity > config.maxQuantityPerItem) {
      throw new BadRequestException(
        `Maximum quantity per item is ${config.maxQuantityPerItem}`,
      );
    }

    const updatedItem = await this.prisma.subscriptionItem.update({
      where: { id: item.id },
      data: { quantity: newQuantity },
    });

    // Recalculate subscription total
    await this.recalculateSubscriptionTotal(subscriptionId);

    this.eventEmitter.emit('subscription.item.quantity_changed', {
      subscriptionId,
      productId,
      oldQuantity: item.quantity,
      newQuantity,
    });

    return updatedItem;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT SWAPPING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Check if swaps are currently allowed
   */
  async getSwapStatus(subscriptionId: string): Promise<{
    status: SwapStatus;
    canSwapUntil?: Date;
    reason?: string;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;

    if (!config || !config.allowSwaps) {
      return {
        status: SwapStatus.NOT_ALLOWED,
        reason: 'Swaps are not allowed for this subscription plan',
      };
    }

    // Calculate swap deadline
    const nextBilling = subscription.nextBillingDate;
    if (!nextBilling) {
      return { status: SwapStatus.ALLOWED };
    }

    const swapDeadline = new Date(nextBilling);
    swapDeadline.setDate(swapDeadline.getDate() - config.swapDeadlineDays);

    if (new Date() > swapDeadline) {
      return {
        status: SwapStatus.DEADLINE_PASSED,
        reason: `Swap deadline was ${swapDeadline.toLocaleDateString()}`,
        canSwapUntil: swapDeadline,
      };
    }

    return {
      status: SwapStatus.ALLOWED,
      canSwapUntil: swapDeadline,
    };
  }

  /**
   * Get available products for swap
   */
  async getAvailableSwaps(
    subscriptionId: string,
    currentProductId: string,
  ): Promise<AvailableSwap[]> {
    const subscription = await this.getSubscriptionWithItems(subscriptionId);

    // Get current product
    const currentItem = subscription.items.find(
      (i) => i.productId === currentProductId,
    );

    if (!currentItem) {
      throw new NotFoundException('Product not found in subscription');
    }

    const currentProduct = await this.prisma.product.findUnique({
      where: { id: currentProductId },
    });

    if (!currentProduct) {
      throw new NotFoundException('Current product not found');
    }

    // Get products in same category (or all products if no category)
    const where: Prisma.ProductWhereInput = {
      companyId: subscription.companyId,
      status: 'ACTIVE',
      id: { not: currentProductId },
      deletedAt: null,
    };

    if (currentProduct.category) {
      where.category = currentProduct.category;
    }

    const availableProducts = await this.prisma.product.findMany({
      where,
      take: 20,
    });

    const currentPrice = Number(currentProduct.price);

    return availableProducts.map((product) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      priceDifference: Number(product.price) - currentPrice,
      imageUrl: undefined, // Image URL from product images relation if needed
      inStock: (product.stockQuantity ?? 0) > 0,
    }));
  }

  /**
   * Swap a product in the subscription
   */
  async swapProduct(dto: SwapProductDto): Promise<SubscriptionItem> {
    // Check swap status
    const swapStatus = await this.getSwapStatus(dto.subscriptionId);
    if (swapStatus.status !== SwapStatus.ALLOWED) {
      throw new BadRequestException(swapStatus.reason || 'Swaps not allowed');
    }

    const subscription = await this.getSubscriptionWithItems(dto.subscriptionId);

    // Find existing item
    const existingItem = subscription.items.find(
      (i) => i.productId === dto.oldProductId,
    );

    if (!existingItem) {
      throw new NotFoundException('Product not found in subscription');
    }

    // Validate new product
    const newProduct = await this.prisma.product.findUnique({
      where: { id: dto.newProductId },
    });

    if (!newProduct) {
      throw new NotFoundException(`Product ${dto.newProductId} not found`);
    }

    if (newProduct.companyId !== subscription.companyId) {
      throw new BadRequestException('Product does not belong to this company');
    }

    // Check if new product already in subscription
    const duplicateItem = subscription.items.find(
      (i) => i.productId === dto.newProductId,
    );

    if (duplicateItem) {
      throw new BadRequestException('Product already in subscription');
    }

    // Update the item
    const updatedItem = await this.prisma.subscriptionItem.update({
      where: { id: existingItem.id },
      data: {
        productId: dto.newProductId,
        priceOverride: newProduct.price,
        quantity: dto.quantity || existingItem.quantity,
      },
    });

    // Recalculate subscription total
    await this.recalculateSubscriptionTotal(dto.subscriptionId);

    this.eventEmitter.emit('subscription.product.swapped', {
      subscriptionId: dto.subscriptionId,
      oldProductId: dto.oldProductId,
      newProductId: dto.newProductId,
    });

    this.logger.log(
      `Product swapped in subscription ${dto.subscriptionId}: ` +
      `${dto.oldProductId} -> ${dto.newProductId}`,
    );

    return updatedItem;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BUILD YOUR OWN BOX
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Build/replace entire box contents
   */
  async buildBox(dto: BuildBoxDto): Promise<Subscription> {
    const subscription = await this.getSubscriptionWithItems(dto.subscriptionId);
    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;

    // Validate box type allows building
    if (config && config.boxType === BoxType.CURATED) {
      throw new BadRequestException('Curated boxes cannot be customized');
    }

    // Validate product count
    if (config) {
      if (dto.products.length < config.minItems) {
        throw new BadRequestException(
          `Minimum ${config.minItems} items required`,
        );
      }
      if (dto.products.length > config.maxItems) {
        throw new BadRequestException(
          `Maximum ${config.maxItems} items allowed`,
        );
      }
    }

    // Validate all products
    const productIds = dto.products.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId: subscription.companyId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or unavailable');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate quantities
    if (config) {
      for (const item of dto.products) {
        if (item.quantity > config.maxQuantityPerItem) {
          throw new BadRequestException(
            `Maximum quantity per item is ${config.maxQuantityPerItem}`,
          );
        }
      }
    }

    // Delete existing items
    await this.prisma.subscriptionItem.deleteMany({
      where: { subscriptionId: dto.subscriptionId },
    });

    // Create new items
    const itemsData = dto.products.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        subscriptionId: dto.subscriptionId,
        productId: item.productId,
        quantity: item.quantity,
        priceOverride: product.price,
        options: { isAddOn: false },
      };
    });

    await this.prisma.subscriptionItem.createMany({
      data: itemsData,
    });

    // Recalculate subscription total
    await this.recalculateSubscriptionTotal(dto.subscriptionId);

    // Return updated subscription
    const updatedSubscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { items: { include: { product: true } } },
    });

    this.eventEmitter.emit('subscription.box.built', {
      subscriptionId: dto.subscriptionId,
      itemCount: dto.products.length,
    });

    this.logger.log(
      `Box built for subscription ${dto.subscriptionId} with ${dto.products.length} items`,
    );

    return updatedSubscription!;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BOX PREVIEW & PRICING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get preview of current box with pricing
   */
  async getBoxPreview(subscriptionId: string): Promise<BoxPreview> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        items: { include: { product: true } },
        subscriptionPlan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;
    const swapStatus = await this.getSwapStatus(subscriptionId);

    // Calculate pricing
    let subtotal = 0;
    const items = subscription.items.map((item) => {
      const unitPrice = Number(item.priceOverride || item.product.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      const itemOptions = item.options as Record<string, unknown> || {};

      return {
        product: item.product,
        quantity: item.quantity,
        isSwappable: config?.allowSwaps ?? false,
        isRequired: false, // Would come from item config
        unitPrice,
        lineTotal,
      };
    });

    // Calculate add-ons total (items marked as add-ons via options)
    const addOnsTotal = subscription.items
      .filter((item) => {
        const opts = item.options as Record<string, unknown> || {};
        return opts.isAddOn === true;
      })
      .reduce((sum, item) => sum + Number(item.priceOverride || 0) * item.quantity, 0);

    // Calculate bundle discount
    const bundleDiscountPct = config?.bundleDiscountPct ?? 0;
    const bundleDiscount = (subtotal - addOnsTotal) * (bundleDiscountPct / 100);

    const total = subtotal - bundleDiscount;

    return {
      subscriptionId,
      planId: subscription.subscriptionPlanId || '',
      boxType: config?.boxType ?? BoxType.CURATED,
      items,
      subtotal,
      bundleDiscount,
      addOnsTotal,
      total,
      canSwapUntil: swapStatus.canSwapUntil,
      swapStatus: swapStatus.status,
    };
  }

  /**
   * Calculate price for a potential box configuration
   */
  async calculateBoxPrice(
    planId: string,
    products: Array<{ productId: string; quantity: number }>,
  ): Promise<{
    subtotal: number;
    bundleDiscount: number;
    total: number;
    savingsPercentage: number;
  }> {
    const config = this.boxConfigurations.get(planId);

    // Get products
    const productIds = products.map((p) => p.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Calculate subtotal
    let subtotal = 0;
    for (const item of products) {
      const product = productMap.get(item.productId);
      if (product) {
        subtotal += Number(product.price) * item.quantity;
      }
    }

    // Calculate bundle discount
    const bundleDiscountPct = config?.bundleDiscountPct ?? 0;
    const bundleDiscount = subtotal * (bundleDiscountPct / 100);

    const total = subtotal - bundleDiscount;

    return {
      subtotal,
      bundleDiscount,
      total,
      savingsPercentage: bundleDiscountPct,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CURATED BOX MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Set curated products for a plan (admin)
   */
  async setCuratedProducts(
    planId: string,
    products: BoxProduct[],
  ): Promise<void> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    // Store curated products in plan metadata
    const existingMetadata = (plan.metadata as Record<string, unknown>) || {};
    await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        metadata: {
          ...existingMetadata,
          curatedProducts: products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            isSwappable: p.isSwappable,
            isRequired: p.isRequired,
            addedPrice: p.addedPrice,
          })),
        },
      },
    });

    this.eventEmitter.emit('subscription.plan.curated_products_updated', {
      planId,
      productCount: products.length,
    });

    this.logger.log(`Curated products set for plan ${planId}: ${products.length} items`);
  }

  /**
   * Get curated products for a plan
   */
  async getCuratedProducts(planId: string): Promise<BoxProduct[]> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    const metadata = plan.metadata as Record<string, unknown>;
    return (metadata?.curatedProducts as BoxProduct[]) || [];
  }

  /**
   * Apply curated products to a subscription
   */
  async applyCuratedProducts(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    if (!subscription.subscriptionPlanId) {
      throw new BadRequestException('Subscription has no plan configured');
    }

    const curatedProducts = await this.getCuratedProducts(subscription.subscriptionPlanId);

    if (curatedProducts.length === 0) {
      throw new BadRequestException('No curated products configured for this plan');
    }

    // Get product details
    const productIds = curatedProducts.map((cp) => cp.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Clear existing items
    await this.prisma.subscriptionItem.deleteMany({
      where: { subscriptionId },
    });

    // Create curated items
    const itemsData = curatedProducts
      .filter((cp) => productMap.has(cp.productId))
      .map((cp) => {
        const product = productMap.get(cp.productId)!;
        return {
          subscriptionId,
          productId: cp.productId,
          quantity: cp.quantity,
          priceOverride: product.price,
          options: { isAddOn: false },
        };
      });

    await this.prisma.subscriptionItem.createMany({
      data: itemsData,
    });

    await this.recalculateSubscriptionTotal(subscriptionId);

    const updated = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { items: { include: { product: true } } },
    });

    this.logger.log(`Curated products applied to subscription ${subscriptionId}`);

    return updated!;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getSubscriptionWithItems(
    subscriptionId: string,
  ): Promise<Subscription & { items: SubscriptionItem[] }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { items: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    return subscription;
  }

  private async recalculateSubscriptionTotal(
    subscriptionId: string,
  ): Promise<void> {
    const subscription = await this.getSubscriptionWithItems(subscriptionId);
    const config = subscription.subscriptionPlanId
      ? this.boxConfigurations.get(subscription.subscriptionPlanId)
      : null;

    // Calculate total from items
    let total = 0;
    for (const item of subscription.items) {
      total += Number(item.priceOverride || 0) * item.quantity;
    }

    // Apply bundle discount
    if (config?.bundleDiscountPct) {
      const nonAddOnTotal = subscription.items
        .filter((item) => {
          const opts = item.options as Record<string, unknown> || {};
          return opts.isAddOn !== true;
        })
        .reduce((sum, item) => sum + Number(item.priceOverride || 0) * item.quantity, 0);

      const discount = nonAddOnTotal * (config.bundleDiscountPct / 100);
      total -= discount;
    }

    // Update subscription
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { planAmount: total },
    });
  }
}
