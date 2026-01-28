import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { TaxService, TaxCalculationResult } from './tax.service';
import { ShippingService, ShippingEstimateResult } from './shipping.service';
import { CartStatus, Prisma, ProductFulfillmentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CartData,
  CartItemData,
  CartTotals,
  AddToCartInput,
  UpdateCartItemInput,
  CartItemSnapshot,
  CartDiscountCode,
  AddBundleToCartInput,
  BundleAddResult,
  BundleItemSelection,
  BundleWithItems,
  BundleItemWithRelations,
} from '../types/cart.types';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { randomBytes } from 'crypto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogsService,
    private readonly taxService: TaxService,
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * Generate a unique session token for anonymous carts
   */
  generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get or create a cart for the given context
   */
  async getOrCreateCart(
    companyId: string,
    options: {
      sessionToken?: string;
      customerId?: string;
      visitorId?: string;
      siteId?: string;
      currency?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    },
  ): Promise<CartData> {
    // Try to find existing active cart
    let cart = await this.prisma.cart.findFirst({
      where: {
        companyId,
        status: CartStatus.ACTIVE,
        OR: [
          { sessionToken: options.sessionToken },
          { customerId: options.customerId },
          { visitorId: options.visitorId },
        ].filter(Boolean),
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { addedAt: 'asc' },
        },
        savedItems: {
          include: { product: true },
          orderBy: { savedAt: 'asc' },
        },
      },
    });

    if (!cart) {
      // Create new cart
      const sessionToken = options.sessionToken || this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiration

      cart = await this.prisma.cart.create({
        data: {
          companyId,
          sessionToken,
          customerId: options.customerId,
          visitorId: options.visitorId,
          siteId: options.siteId,
          currency: options.currency || 'USD',
          utmSource: options.utmSource,
          utmMedium: options.utmMedium,
          utmCampaign: options.utmCampaign,
          expiresAt,
        },
        include: {
          items: {
            include: { product: true },
            orderBy: { addedAt: 'asc' },
          },
          savedItems: {
            include: { product: true },
            orderBy: { savedAt: 'asc' },
          },
        },
      });
    }

    return this.toCartData(cart);
  }

  /**
   * Get cart by session token
   */
  async getCartBySessionToken(sessionToken: string, companyId: string): Promise<CartData | null> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        sessionToken,
        companyId,
        status: CartStatus.ACTIVE,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { addedAt: 'asc' },
        },
        savedItems: {
          include: { product: true },
          orderBy: { savedAt: 'asc' },
        },
      },
    });

    return cart ? this.toCartData(cart) : null;
  }

  /**
   * Get cart by customer ID
   */
  async getCartByCustomerId(customerId: string, companyId: string): Promise<CartData | null> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        customerId,
        companyId,
        status: CartStatus.ACTIVE,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { addedAt: 'asc' },
        },
        savedItems: {
          include: { product: true },
          orderBy: { savedAt: 'asc' },
        },
      },
    });

    return cart ? this.toCartData(cart) : null;
  }

  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    input: AddToCartInput,
    performedBy?: string,
  ): Promise<CartData> {
    // Get cart and product
    const [cart, product] = await Promise.all([
      this.prisma.cart.findUnique({ where: { id: cartId } }),
      this.prisma.product.findUnique({ where: { id: input.productId } }),
    ]);

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    if (!product) {
      throw new NotFoundException('We couldn\'t find that product. It may have been removed from the catalog.');
    }

    // SECURITY: Validate product belongs to the same company as the cart
    if (product.companyId !== cart.companyId) {
      throw new ForbiddenException('This product isn\'t available in your store. Please try a different one.');
    }

    if (product.status !== 'ACTIVE' || !product.isVisible) {
      throw new BadRequestException('This product is currently unavailable. Check back soon!');
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        productId: input.productId,
        variantId: input.variantId || null,
      },
    });

    const unitPrice = Number(product.price);
    const productSnapshot: CartItemSnapshot = {
      name: product.name,
      sku: product.sku,
      image: product.images?.[0]?.url,
      originalPrice: unitPrice,
    };

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + input.quantity;
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          lineTotal: unitPrice * newQuantity,
        },
      });
    } else {
      // Add new item
      await this.prisma.cartItem.create({
        data: {
          cartId,
          productId: input.productId,
          variantId: input.variantId,
          productSnapshot: productSnapshot as unknown as Prisma.InputJsonValue,
          quantity: input.quantity,
          unitPrice,
          originalPrice: unitPrice,
          lineTotal: unitPrice * input.quantity,
          customFields: (input.customFields || {}) as Prisma.InputJsonValue,
          giftMessage: input.giftMessage,
          isGift: input.isGift || false,
        },
      });
    }

    // Recalculate totals
    await this.recalculateTotals(cartId);

    // Update last activity
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { lastActivityAt: new Date() },
    });

    // Audit log
    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.CREATE,
        'CartItem',
        cartId,
        {
          userId: performedBy,
          changes: { productId: { before: null, after: input.productId }, quantity: { before: null, after: input.quantity } },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Add bundle to cart
   *
   * Adds all items from a bundle to the cart as a group, applying bundle pricing.
   * Supports fixed bundles (all items required) and mix-and-match bundles.
   */
  async addBundleToCart(
    cartId: string,
    input: AddBundleToCartInput,
    performedBy?: string,
  ): Promise<BundleAddResult> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    // Get bundle with items
    const bundle = await this.prisma.bundle.findUnique({
      where: { id: input.bundleId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true, companyId: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true, images: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!bundle || bundle.deletedAt) {
      throw new NotFoundException('We couldn\'t find that bundle. It may have been removed from the catalog.');
    }

    // SECURITY: Validate bundle belongs to the same company as the cart
    if (bundle.companyId !== cart.companyId) {
      throw new ForbiddenException('This bundle isn\'t available in your store. Please try a different one.');
    }

    if (!bundle.isActive) {
      throw new BadRequestException('This bundle is currently unavailable. Check back soon!');
    }

    // For mix-and-match bundles, validate selected items
    let itemsToAdd = bundle.items;
    if (bundle.type === 'MIX_AND_MATCH' && input.selectedItems) {
      // Validate selection constraints
      const totalQuantity = input.selectedItems.reduce((sum, i) => sum + i.quantity, 0);

      if (bundle.minItems && totalQuantity < bundle.minItems) {
        throw new BadRequestException(`Almost there! This bundle needs at least ${bundle.minItems} items.`);
      }

      if (bundle.maxItems && totalQuantity > bundle.maxItems) {
        throw new BadRequestException(`This bundle has a maximum of ${bundle.maxItems} items. Please adjust your selection.`);
      }

      // Filter to selected items
      itemsToAdd = bundle.items.filter((item) =>
        input.selectedItems!.some(
          (s) =>
            s.productId === item.productId &&
            (s.variantId || null) === (item.variantId || null),
        ),
      );
    }

    // Calculate bundle price
    const bundlePrice = await this.calculateBundlePrice(bundle, input.selectedItems);

    // Generate unique bundle group ID
    const bundleGroupId = `bundle_${randomBytes(8).toString('hex')}`;
    const bundleQuantity = input.quantity || 1;

    // Add each bundle item to the cart - wrapped in transaction for atomicity
    let itemsAdded = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const bundleItem of itemsToAdd) {
        const selectedQuantity =
          input.selectedItems?.find(
            (s) =>
              s.productId === bundleItem.productId &&
              (s.variantId || null) === (bundleItem.variantId || null),
          )?.quantity || bundleItem.quantity;

        const product = bundleItem.product;
        if (!product) continue;

        // Use price override if set, otherwise variant/product price
        const unitPrice = bundleItem.priceOverride
          ? Number(bundleItem.priceOverride)
          : Number(bundleItem.variant?.price || product.price || 0);

        const quantity = selectedQuantity * bundleQuantity;

        const productSnapshot: CartItemSnapshot = {
          name: bundleItem.variant?.name || product.name,
          sku: bundleItem.variant?.sku || product.sku,
          image: (product.images as { url?: string }[])?.[0]?.url,
          originalPrice: unitPrice,
          bundleId: bundle.id,
          bundleName: bundle.product?.name,
          bundleGroupId,
        };

        // Check if this exact item (same product+variant+bundle) already exists
        const existingItem = await tx.cartItem.findFirst({
          where: {
            cartId,
            productId: bundleItem.productId,
            variantId: bundleItem.variantId || null,
            customFields: {
              path: ['bundleGroupId'],
              equals: bundleGroupId,
            },
          },
        });

        if (existingItem) {
          // Update quantity
          const newQuantity = existingItem.quantity + quantity;
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: newQuantity,
              lineTotal: unitPrice * newQuantity,
            },
          });
        } else {
          // Add new item
          await tx.cartItem.create({
            data: {
              cartId,
              productId: bundleItem.productId,
              variantId: bundleItem.variantId,
              productSnapshot: productSnapshot as unknown as Prisma.InputJsonValue,
              quantity,
              unitPrice,
              originalPrice: unitPrice,
              lineTotal: unitPrice * quantity,
              customFields: {
                bundleId: bundle.id,
                bundleProductId: bundle.productId,
                bundleGroupId,
                isBundleItem: true,
              } as Prisma.InputJsonValue,
              isGift: false,
            },
          });
          itemsAdded++;
        }
      }

      // Recalculate totals within transaction
      await this.recalculateTotalsWithTx(tx, cartId);

      // Update last activity
      await tx.cart.update({
        where: { id: cartId },
        data: { lastActivityAt: new Date() },
      });
    });

    // Audit log
    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.CREATE,
        'CartItem',
        cartId,
        {
          userId: performedBy,
          changes: {
            bundleId: { before: null, after: input.bundleId },
            bundleGroupId: { before: null, after: bundleGroupId },
            itemsAdded: { before: null, after: itemsAdded },
          },
        },
      );
    }

    const updatedCart = await this.getCartById(cartId);

    return {
      cart: updatedCart,
      bundleGroupId,
      bundlePrice,
      itemsAdded,
    };
  }

  /**
   * Remove bundle from cart
   *
   * Removes all items in a bundle group from the cart.
   * Wrapped in transaction for atomicity.
   */
  async removeBundleFromCart(
    cartId: string,
    bundleGroupId: string,
    performedBy?: string,
  ): Promise<CartData> {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    // Find all items with this bundle group ID
    const bundleItems = await this.prisma.cartItem.findMany({
      where: {
        cartId,
        customFields: {
          path: ['bundleGroupId'],
          equals: bundleGroupId,
        },
      },
    });

    if (bundleItems.length === 0) {
      throw new NotFoundException('We couldn\'t find that bundle in your cart. It may have already been removed.');
    }

    // Wrap deletion and totals update in transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete all bundle items
      await tx.cartItem.deleteMany({
        where: {
          id: { in: bundleItems.map((i) => i.id) },
        },
      });

      // Recalculate totals
      await this.recalculateTotalsWithTx(tx, cartId);

      // Update last activity
      await tx.cart.update({
        where: { id: cartId },
        data: { lastActivityAt: new Date() },
      });
    });

    // Audit log
    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.DELETE,
        'CartItem',
        cartId,
        {
          userId: performedBy,
          metadata: { bundleGroupId, itemsRemoved: bundleItems.length },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Calculate bundle price based on pricing strategy
   */
  private async calculateBundlePrice(
    bundle: BundleWithItems,
    selectedItems?: BundleItemSelection[],
  ): Promise<number> {
    let itemsTotal = 0;

    const itemsToProcess: BundleItemSelection[] =
      selectedItems ||
      bundle.items.map((i: BundleItemWithRelations) => ({
        productId: i.productId,
        variantId: i.variantId || undefined,
        quantity: i.quantity,
      }));

    for (const selected of itemsToProcess) {
      const bundleItem = bundle.items.find(
        (i: BundleItemWithRelations) =>
          i.productId === selected.productId &&
          (i.variantId || null) === (selected.variantId || null),
      );

      if (bundleItem) {
        const basePrice = bundleItem.priceOverride
          ? Number(bundleItem.priceOverride)
          : Number(bundleItem.variant?.price || bundleItem.product?.price || 0);

        itemsTotal += basePrice * selected.quantity;
      }
    }

    const basePrice = Number(bundle.product?.price || 0);
    let finalPrice: number;

    switch (bundle.pricingStrategy) {
      case 'FIXED':
        finalPrice = basePrice;
        break;

      case 'CALCULATED':
        if (bundle.discountType && bundle.discountValue) {
          const discountVal = Number(bundle.discountValue);
          switch (bundle.discountType) {
            case 'PERCENTAGE':
              finalPrice = itemsTotal * (1 - discountVal / 100);
              break;
            case 'FIXED_AMOUNT':
              finalPrice = itemsTotal - discountVal;
              break;
            case 'FIXED_PRICE':
              finalPrice = discountVal;
              break;
            default:
              finalPrice = itemsTotal;
          }
        } else {
          finalPrice = itemsTotal;
        }
        break;

      case 'TIERED':
        const itemCount = itemsToProcess.reduce((sum: number, i: BundleItemSelection) => sum + i.quantity, 0);
        let tierDiscount = 0;
        if (itemCount >= 5) tierDiscount = 0.15;
        else if (itemCount >= 3) tierDiscount = 0.1;
        else if (itemCount >= 2) tierDiscount = 0.05;
        finalPrice = itemsTotal * (1 - tierDiscount);
        break;

      default:
        finalPrice = itemsTotal;
    }

    return Math.max(0, finalPrice);
  }

  /**
   * Update cart item
   */
  async updateItem(
    cartId: string,
    itemId: string,
    input: UpdateCartItemInput,
    performedBy?: string,
  ): Promise<CartData> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException('We couldn\'t find that item in your cart. It may have already been removed.');
    }

    if (input.quantity === 0) {
      // Remove item if quantity is 0
      return this.removeItem(cartId, itemId, performedBy);
    }

    const updateData: Prisma.CartItemUpdateInput = {};

    if (input.quantity !== undefined) {
      updateData.quantity = input.quantity;
      updateData.lineTotal = Number(item.unitPrice) * input.quantity;
    }
    if (input.customFields !== undefined) {
      updateData.customFields = input.customFields as Prisma.InputJsonValue;
    }
    if (input.giftMessage !== undefined) {
      updateData.giftMessage = input.giftMessage;
    }
    if (input.isGift !== undefined) {
      updateData.isGift = input.isGift;
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: updateData,
    });

    await this.recalculateTotals(cartId);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { lastActivityAt: new Date() },
    });

    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'CartItem',
        itemId,
        {
          userId: performedBy,
          metadata: input as unknown as Record<string, unknown>,
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    cartId: string,
    itemId: string,
    performedBy?: string,
  ): Promise<CartData> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException('We couldn\'t find that item in your cart. It may have already been removed.');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotals(cartId);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { lastActivityAt: new Date() },
    });

    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.DELETE,
        'CartItem',
        itemId,
        {
          userId: performedBy,
          metadata: { productId: item.productId },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Save item for later
   */
  async saveForLater(
    cartId: string,
    itemId: string,
    performedBy?: string,
  ): Promise<CartData> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException('We couldn\'t find that item in your cart. It may have already been removed.');
    }

    // Create saved item
    await this.prisma.savedCartItem.create({
      data: {
        cartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        priceAtSave: item.unitPrice,
      },
    });

    // Remove from cart
    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotals(cartId);

    return this.getCartById(cartId);
  }

  /**
   * Move saved item back to cart
   */
  async moveToCart(
    cartId: string,
    savedItemId: string,
    quantity?: number,
    performedBy?: string,
  ): Promise<CartData> {
    const savedItem = await this.prisma.savedCartItem.findFirst({
      where: { id: savedItemId, cartId },
      include: { product: true },
    });

    if (!savedItem) {
      throw new NotFoundException('We couldn\'t find that saved item. It may have already been moved to your cart.');
    }

    // Add to cart
    await this.addItem(cartId, {
      productId: savedItem.productId,
      variantId: savedItem.variantId || undefined,
      quantity: quantity || savedItem.quantity,
    }, performedBy);

    // Remove from saved
    await this.prisma.savedCartItem.delete({
      where: { id: savedItemId },
    });

    return this.getCartById(cartId);
  }

  /**
   * Apply discount code
   *
   * Validates and applies a discount code to the cart.
   * Supports both percentage and fixed amount discounts.
   */
  async applyDiscount(
    cartId: string,
    code: string,
    performedBy?: string,
  ): Promise<CartData> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    // Normalize code to uppercase for consistent comparison
    const normalizedCode = code.toUpperCase().trim();

    if (!normalizedCode) {
      throw new BadRequestException('Please enter a valid discount code.');
    }

    const discountCodes = (cart.discountCodes as unknown as CartDiscountCode[]) || [];

    if (discountCodes.some(d => d.code.toUpperCase() === normalizedCode)) {
      throw new BadRequestException('You\'ve already applied this discount code!');
    }

    // Validate discount code against promotions
    const discountResult = await this.validateAndCalculateDiscount(normalizedCode, cart);

    if (!discountResult.valid) {
      throw new BadRequestException(discountResult.error || 'Invalid discount code');
    }

    // Add validated discount code
    discountCodes.push({
      code: normalizedCode,
      discountAmount: discountResult.discountAmount,
      type: discountResult.type,
      description: discountResult.description,
    });

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        discountCodes: discountCodes as unknown as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
      },
    });

    await this.recalculateTotals(cartId);

    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'Cart',
        cartId,
        {
          userId: performedBy,
          metadata: { action: 'apply_discount', code: normalizedCode, amount: discountResult.discountAmount },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Validate and calculate discount amount
   *
   * This method validates discount codes against the Promotion model
   * and calculates the discount amount based on promotion type and rules.
   */
  private async validateAndCalculateDiscount(
    code: string,
    cart: { companyId: string; items: { lineTotal: any; productId?: string }[]; customerId?: string },
  ): Promise<{
    valid: boolean;
    discountAmount: number;
    type: 'percentage' | 'fixed';
    description?: string;
    error?: string;
    promotionId?: string;
  }> {
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const now = new Date();

    // Query the Promotion model for valid promotion
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        companyId: cart.companyId,
        code: code.toUpperCase(),
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } },
        ],
      },
    });

    if (!promotion) {
      // Fall back to demo codes in non-production for backwards compatibility
      const isNonProduction = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
      if (isNonProduction) {
        const demoDiscount = this.getDemoDiscountCode(code);
        if (demoDiscount) {
          if (process.env.NODE_ENV !== 'test') {
            this.logger.warn(`Using demo discount code: ${code} - Non-production only!`);
          }
          return this.validateDemoDiscount(demoDiscount, subtotal);
        }
      }
      return { valid: false, discountAmount: 0, type: 'fixed', error: 'Hmm, that code doesn\'t seem to work. Double-check the spelling or try another one.' };
    }

    // Check usage limits - total uses
    if (promotion.maxUsesTotal && promotion.currentUses >= promotion.maxUsesTotal) {
      return { valid: false, discountAmount: 0, type: 'fixed', error: 'This discount has been fully claimed! Keep an eye out for future offers.' };
    }

    // Check usage limits - per customer
    if (promotion.maxUsesPerCustomer && cart.customerId) {
      const customerUses = await this.prisma.promotionUsage.count({
        where: {
          promotionId: promotion.id,
          customerId: cart.customerId,
        },
      });
      if (customerUses >= promotion.maxUsesPerCustomer) {
        return { valid: false, discountAmount: 0, type: 'fixed', error: 'You\'ve already used this code the maximum number of times. Thanks for being a loyal customer!' };
      }
    }

    // Check minimum order amount
    if (promotion.minimumOrderAmount && subtotal < Number(promotion.minimumOrderAmount)) {
      return {
        valid: false,
        discountAmount: 0,
        type: 'fixed',
        error: `Almost there! Add $${(Number(promotion.minimumOrderAmount) - subtotal).toFixed(2)} more to unlock this discount.`,
      };
    }

    // Check targeting rules if specified
    const targeting = promotion.targeting as { productIds?: string[]; categoryIds?: string[]; excludeProductIds?: string[] } | null;
    if (targeting) {
      const cartProductIds = cart.items.map(item => item.productId).filter(Boolean) as string[];

      // Check if any cart item is in excluded products
      if (targeting.excludeProductIds?.length) {
        const hasExcluded = cartProductIds.some(id => targeting.excludeProductIds!.includes(id));
        if (hasExcluded) {
          return { valid: false, discountAmount: 0, type: 'fixed', error: 'This code doesn\'t apply to some items in your cart. Try removing them or use a different code.' };
        }
      }

      // Check if cart has required products
      if (targeting.productIds?.length) {
        const hasRequiredProduct = cartProductIds.some(id => targeting.productIds!.includes(id));
        if (!hasRequiredProduct) {
          return { valid: false, discountAmount: 0, type: 'fixed', error: 'This code works on specific products. Add an eligible item to use it!' };
        }
      }
    }

    // Calculate discount based on promotion type
    let discountAmount: number;
    let discountType: 'percentage' | 'fixed' = 'fixed';

    switch (promotion.type) {
      case 'PERCENTAGE_OFF':
        discountType = 'percentage';
        discountAmount = Math.round((subtotal * Number(promotion.value)) / 100 * 100) / 100;
        break;
      case 'FIXED_AMOUNT_OFF':
        discountType = 'fixed';
        discountAmount = Math.min(Number(promotion.value), subtotal);
        break;
      case 'FREE_SHIPPING':
        // Free shipping is handled separately in shipping calculation
        discountAmount = 0;
        break;
      case 'BUY_X_GET_Y':
        // Buy X Get Y requires special handling based on cart contents
        discountAmount = await this.calculateBuyXGetYDiscount(promotion, cart);
        break;
      case 'FREE_GIFT':
        // Free gift is handled separately
        discountAmount = 0;
        break;
      default:
        discountAmount = 0;
    }

    // Apply maximum discount cap if set
    if (promotion.maximumDiscount && discountAmount > Number(promotion.maximumDiscount)) {
      discountAmount = Number(promotion.maximumDiscount);
    }

    return {
      valid: true,
      discountAmount,
      type: discountType,
      description: promotion.description || promotion.name,
      promotionId: promotion.id,
    };
  }

  /**
   * Calculate discount for Buy X Get Y promotions
   */
  private async calculateBuyXGetYDiscount(
    promotion: { buyQuantity: number | null; getQuantity: number | null; getProductId: string | null; value: any },
    cart: { items: { productId?: string; quantity?: number; lineTotal: any }[] },
  ): Promise<number> {
    if (!promotion.buyQuantity || !promotion.getQuantity) {
      return 0;
    }

    // Count qualifying items in cart
    let qualifyingQuantity = 0;
    for (const item of cart.items) {
      qualifyingQuantity += item.quantity || 1;
    }

    // Calculate how many "get" items are free/discounted
    const sets = Math.floor(qualifyingQuantity / (promotion.buyQuantity + promotion.getQuantity));
    const freeItems = sets * promotion.getQuantity;

    if (freeItems === 0) {
      return 0;
    }

    // Calculate average item price for discount
    const avgItemPrice = cart.items.reduce((sum, item) => sum + Number(item.lineTotal), 0) / qualifyingQuantity;

    // Value represents the discount percentage on the "get" items (100 = free)
    const discountPercent = Number(promotion.value) / 100;
    return Math.round(freeItems * avgItemPrice * discountPercent * 100) / 100;
  }

  /**
   * Get demo discount code configuration (development only)
   */
  private getDemoDiscountCode(code: string): {
    type: 'percentage' | 'fixed';
    value: number;
    description: string;
    minOrderAmount?: number;
  } | null {
    const demoDiscounts: Record<string, {
      type: 'percentage' | 'fixed';
      value: number;
      description: string;
      minOrderAmount?: number;
    }> = {
      'SAVE10': { type: 'percentage', value: 10, description: '10% off your order' },
      'SAVE20': { type: 'percentage', value: 20, description: '20% off your order' },
      'FLAT5': { type: 'fixed', value: 5, description: '$5 off your order', minOrderAmount: 20 },
      'FLAT10': { type: 'fixed', value: 10, description: '$10 off your order', minOrderAmount: 50 },
      'WELCOME': { type: 'percentage', value: 15, description: '15% welcome discount' },
    };
    return demoDiscounts[code] || null;
  }

  /**
   * Validate demo discount and calculate amount (development only)
   */
  private validateDemoDiscount(
    discount: { type: 'percentage' | 'fixed'; value: number; description: string; minOrderAmount?: number },
    subtotal: number,
  ): { valid: boolean; discountAmount: number; type: 'percentage' | 'fixed'; description?: string; error?: string } {
    // Check minimum order amount
    if (discount.minOrderAmount && subtotal < discount.minOrderAmount) {
      return {
        valid: false,
        discountAmount: 0,
        type: 'fixed',
        error: `Almost there! Add $${(discount.minOrderAmount - subtotal).toFixed(2)} more to unlock this discount.`,
      };
    }

    // Calculate discount amount
    let discountAmount: number;
    if (discount.type === 'percentage') {
      discountAmount = Math.round((subtotal * discount.value) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(discount.value, subtotal);
    }

    return {
      valid: true,
      discountAmount,
      type: discount.type,
      description: discount.description,
    };
  }

  /**
   * Remove discount code
   */
  async removeDiscount(
    cartId: string,
    code: string,
    performedBy?: string,
  ): Promise<CartData> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    const discountCodes = ((cart.discountCodes as unknown as CartDiscountCode[]) || [])
      .filter(d => d.code !== code);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        discountCodes: discountCodes as unknown as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
      },
    });

    await this.recalculateTotals(cartId);

    return this.getCartById(cartId);
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: string, performedBy?: string): Promise<CartData> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
        itemCount: 0,
        discountCodes: [],
        lastActivityAt: new Date(),
      },
    });

    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.DELETE,
        'Cart',
        cartId,
        {
          userId: performedBy,
          metadata: { action: 'clear' },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Merge carts (e.g., when user logs in)
   */
  async mergeCarts(
    sourceCartId: string,
    targetCartId: string,
    performedBy?: string,
  ): Promise<CartData> {
    const [sourceCart, targetCart] = await Promise.all([
      this.prisma.cart.findUnique({
        where: { id: sourceCartId },
        include: { items: true },
      }),
      this.prisma.cart.findUnique({
        where: { id: targetCartId },
      }),
    ]);

    if (!sourceCart || !targetCart) {
      throw new NotFoundException('We couldn\'t find one of the carts to merge. It may have expired.');
    }

    // Move items from source to target
    for (const item of sourceCart.items) {
      await this.addItem(targetCartId, {
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        customFields: item.customFields as Record<string, unknown>,
        giftMessage: item.giftMessage || undefined,
        isGift: item.isGift,
      });
    }

    // Mark source cart as merged
    await this.prisma.cart.update({
      where: { id: sourceCartId },
      data: {
        status: CartStatus.MERGED,
        mergedIntoCartId: targetCartId,
        mergedAt: new Date(),
      },
    });

    // Delete source cart items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: sourceCartId },
    });

    return this.getCartById(targetCartId);
  }

  /**
   * Update shipping address for tax/shipping calculations
   */
  async updateShippingAddress(
    cartId: string,
    address: {
      postalCode?: string;
      country?: string;
      state?: string;
      city?: string;
    },
    performedBy?: string,
  ): Promise<CartData> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        shippingPostalCode: address.postalCode ?? cart.shippingPostalCode,
        shippingCountry: address.country ?? cart.shippingCountry,
        metadata: {
          ...(cart.metadata as Record<string, unknown> || {}),
          shippingState: address.state,
          shippingCity: address.city,
        },
        lastActivityAt: new Date(),
      },
    });

    // Recalculate totals with new address
    await this.recalculateTotals(cartId);

    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'Cart',
        cartId,
        {
          userId: performedBy,
          metadata: { action: 'update_shipping_address', ...address },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Select a shipping method for the cart
   */
  async selectShippingMethod(
    cartId: string,
    shippingMethodId: string,
    performedBy?: string,
  ): Promise<CartData> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    // Verify the shipping method exists and get its rate
    const shippingRule = await this.prisma.shippingRule.findUnique({
      where: { id: shippingMethodId },
      include: { zone: true },
    });

    if (!shippingRule) {
      throw new NotFoundException('We couldn\'t find that shipping method. Please select a different one.');
    }

    // Verify the rule belongs to a zone owned by this company
    if (shippingRule.zone.companyId !== cart.companyId) {
      throw new ForbiddenException('This shipping method isn\'t available for your location. Please try another option.');
    }

    // Calculate the actual shipping rate based on cart
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = cart.items.reduce((sum, item) => {
      // Weight might be stored in product snapshot
      const snapshot = item.productSnapshot as Record<string, unknown>;
      const weight = snapshot?.weight as number || 0;
      return sum + weight * item.quantity;
    }, 0);

    // Calculate rate based on rule type
    let shippingRate = Number(shippingRule.baseRate);

    if (shippingRule.type === 'PER_ITEM' && shippingRule.perItemRate) {
      shippingRate += Number(shippingRule.perItemRate) * totalQuantity;
    } else if (shippingRule.type === 'WEIGHT_BASED' && shippingRule.perWeightUnitRate && totalWeight > 0) {
      shippingRate += Number(shippingRule.perWeightUnitRate) * totalWeight;
    } else if (shippingRule.type === 'FREE') {
      shippingRate = 0;
    }

    // Check for free shipping threshold
    if (shippingRule.freeShippingThreshold && subtotal >= Number(shippingRule.freeShippingThreshold)) {
      shippingRate = 0;
    }

    // Store selected shipping method in metadata
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        shippingTotal: shippingRate,
        metadata: {
          ...(cart.metadata as Record<string, unknown> || {}),
          selectedShippingMethodId: shippingMethodId,
          selectedShippingMethodName: shippingRule.name,
          shippingCarrier: shippingRule.carrier,
          estimatedDeliveryMin: shippingRule.estimatedDaysMin,
          estimatedDeliveryMax: shippingRule.estimatedDaysMax,
        },
        lastActivityAt: new Date(),
      },
    });

    // Recalculate grand total
    await this.recalculateTotals(cartId);

    if (performedBy) {
      await this.auditLogService.log(
        AuditAction.UPDATE,
        'Cart',
        cartId,
        {
          userId: performedBy,
          metadata: { action: 'select_shipping_method', shippingMethodId, shippingRate },
        },
      );
    }

    return this.getCartById(cartId);
  }

  /**
   * Check if cart requires shipping based on product types
   */
  async cartRequiresShipping(cartId: string): Promise<boolean> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: { fulfillmentType: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return false;
    }

    // Cart requires shipping if ANY item is a physical product
    return cart.items.some((item) => {
      const fulfillmentType = item.product?.fulfillmentType;
      // PHYSICAL products require shipping, VIRTUAL and ELECTRONIC do not
      return fulfillmentType === ProductFulfillmentType.PHYSICAL || fulfillmentType === undefined;
    });
  }

  /**
   * Mark cart as abandoned
   */
  async markAbandoned(cartId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status: CartStatus.ABANDONED,
        abandonedAt: new Date(),
      },
    });
  }

  /**
   * Mark cart as converted (order placed)
   */
  async markConverted(cartId: string, orderId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status: CartStatus.CONVERTED,
        convertedAt: new Date(),
        orderId,
      },
    });
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId: string): Promise<CartData> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: true },
          orderBy: { addedAt: 'asc' },
        },
        savedItems: {
          include: { product: true },
          orderBy: { savedAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    return this.toCartData(cart);
  }

  /**
   * Recalculate cart totals
   *
   * Calculates subtotal, applies discounts, calculates tax, and computes grand total.
   * Tax is calculated based on shipping address (country/state/zip).
   * Shipping is preserved if already selected, otherwise set to 0.
   */
  private async recalculateTotals(cartId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, fulfillmentType: true },
            },
          },
        },
      },
    });

    if (!cart) {
      return;
    }

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate discount total from applied discount codes
    const discountCodes = (cart.discountCodes as unknown as CartDiscountCode[]) || [];
    let discountTotal = 0;

    // Re-calculate discount amounts based on current subtotal
    const updatedDiscountCodes: CartDiscountCode[] = [];
    for (const discount of discountCodes) {
      let discountAmount: number;
      if (discount.type === 'percentage') {
        // Need to re-calculate percentage-based discounts
        const discountResult = await this.validateAndCalculateDiscount(discount.code, {
          companyId: cart.companyId,
          items: cart.items,
        });
        discountAmount = discountResult.discountAmount;
      } else {
        discountAmount = Math.min(discount.discountAmount, subtotal - discountTotal);
      }
      discountTotal += discountAmount;
      updatedDiscountCodes.push({
        ...discount,
        discountAmount,
      });
    }

    // Ensure discount doesn't exceed subtotal
    discountTotal = Math.min(discountTotal, subtotal);

    // Calculate tax if shipping address is available
    let taxTotal = 0;
    const metadata = cart.metadata as Record<string, unknown> || {};

    if (cart.shippingCountry) {
      try {
        // Prepare line items for tax calculation
        const taxableLineItems = cart.items.map((item) => {
          const snapshot = item.productSnapshot as Record<string, unknown>;
          return {
            productId: item.productId,
            categoryId: snapshot?.categoryId as string | undefined,
            quantity: item.quantity,
            lineTotal: new Decimal(item.lineTotal),
            // Products marked as tax-exempt (e.g., some digital products) can be excluded
            isTaxable: item.product?.fulfillmentType !== ProductFulfillmentType.VIRTUAL,
          };
        });

        const taxResult = await this.taxService.calculateTax({
          companyId: cart.companyId,
          country: cart.shippingCountry,
          state: metadata.shippingState as string | undefined,
          city: metadata.shippingCity as string | undefined,
          zipCode: cart.shippingPostalCode || undefined,
          lineItems: taxableLineItems,
        });

        taxTotal = Number(taxResult.totalTax);

        // Store tax breakdown in metadata for transparency
        metadata.taxBreakdown = taxResult.breakdown.map((b) => ({
          name: b.name,
          rate: Number(b.rate),
          amount: Number(b.taxAmount),
        }));
      } catch (error) {
        this.logger.warn(`Failed to calculate tax for cart ${cartId}: ${error}`);
        // Continue without tax if calculation fails
      }
    }

    // Preserve existing shipping if a method has been selected
    // Otherwise, shipping remains 0 until user selects a method
    const shippingTotal = Number(cart.shippingTotal) || 0;

    const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal + shippingTotal);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        discountTotal,
        taxTotal,
        shippingTotal,
        grandTotal,
        itemCount,
        discountCodes: updatedDiscountCodes as unknown as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Recalculate cart totals within a transaction
   *
   * Simplified version for bundle operations that doesn't re-validate discounts.
   * Preserves existing tax and shipping values (they'll be recalculated separately
   * when shipping address is updated).
   */
  private async recalculateTotalsWithTx(
    tx: Prisma.TransactionClient,
    cartId: string,
  ): Promise<void> {
    const cart = await tx.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      return;
    }

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Preserve existing discount calculations for bundle operations
    const discountCodes = (cart.discountCodes as unknown as CartDiscountCode[]) || [];
    let discountTotal = discountCodes.reduce((sum, d) => sum + d.discountAmount, 0);

    // Ensure discount doesn't exceed subtotal
    discountTotal = Math.min(discountTotal, subtotal);

    // Preserve existing tax and shipping values
    // They will be recalculated when shipping address is updated
    const taxTotal = Number(cart.taxTotal) || 0;
    const shippingTotal = Number(cart.shippingTotal) || 0;
    const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal + shippingTotal);

    await tx.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        discountTotal,
        taxTotal,
        shippingTotal,
        grandTotal,
        itemCount,
      },
    });
  }

  /**
   * Convert Prisma cart to CartData
   */
  private toCartData(cart: any): CartData {
    return {
      id: cart.id,
      companyId: cart.companyId,
      siteId: cart.siteId || undefined,
      customerId: cart.customerId || undefined,
      sessionToken: cart.sessionToken || undefined,
      visitorId: cart.visitorId || undefined,
      status: cart.status,
      currency: cart.currency,
      totals: {
        subtotal: Number(cart.subtotal),
        discountTotal: Number(cart.discountTotal),
        taxTotal: Number(cart.taxTotal),
        shippingTotal: Number(cart.shippingTotal),
        grandTotal: Number(cart.grandTotal),
        itemCount: cart.itemCount,
      },
      discountCodes: (cart.discountCodes as CartDiscountCode[]) || [],
      items: cart.items?.map((item: any) => this.toCartItemData(item)) || [],
      savedItems: cart.savedItems?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        priceAtSave: Number(item.priceAtSave),
        savedAt: item.savedAt,
      })) || [],
      shippingPostalCode: cart.shippingPostalCode || undefined,
      shippingCountry: cart.shippingCountry || undefined,
      notes: cart.notes || undefined,
      metadata: cart.metadata as Record<string, unknown> || {},
      utmSource: cart.utmSource || undefined,
      utmMedium: cart.utmMedium || undefined,
      utmCampaign: cart.utmCampaign || undefined,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      lastActivityAt: cart.lastActivityAt,
      expiresAt: cart.expiresAt || undefined,
    };
  }

  /**
   * Convert Prisma cart item to CartItemData
   */
  private toCartItemData(item: any): CartItemData {
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId || undefined,
      productSnapshot: item.productSnapshot as CartItemSnapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      originalPrice: Number(item.originalPrice),
      discountAmount: Number(item.discountAmount),
      lineTotal: Number(item.lineTotal),
      customFields: item.customFields as Record<string, unknown>,
      giftMessage: item.giftMessage || undefined,
      isGift: item.isGift,
      addedAt: item.addedAt,
    };
  }
}
