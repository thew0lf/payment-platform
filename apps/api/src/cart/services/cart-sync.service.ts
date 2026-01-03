import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartStatus, Prisma } from '@prisma/client';

export interface CartMergeResult {
  mergedCartId: string;
  itemsMerged: number;
  itemsFromAnonymous: number;
  itemsFromCustomer: number;
  savedItemsMerged: number;
  discountsPreserved: string[];
}

export interface SyncResult {
  success: boolean;
  cartId: string;
  sessionToken: string;
  itemCount: number;
  lastSyncedAt: Date;
}

@Injectable()
export class CartSyncService {
  private readonly logger = new Logger(CartSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Merge anonymous cart into customer's cart when they log in
   * Strategy: Customer's cart takes priority, anonymous items are added if not duplicates
   */
  async mergeCartsOnLogin(
    customerId: string,
    anonymousSessionToken: string,
    companyId: string,
  ): Promise<CartMergeResult | null> {
    // Find both carts
    const [customerCart, anonymousCart] = await Promise.all([
      this.prisma.cart.findFirst({
        where: {
          companyId,
          customerId,
          status: CartStatus.ACTIVE,
        },
        include: {
          items: true,
          savedItems: true,
        },
      }),
      this.prisma.cart.findFirst({
        where: {
          companyId,
          sessionToken: anonymousSessionToken,
          customerId: null,
          status: CartStatus.ACTIVE,
        },
        include: {
          items: true,
          savedItems: true,
        },
      }),
    ]);

    // No anonymous cart to merge
    if (!anonymousCart) {
      this.logger.debug(`No anonymous cart to merge for session ${anonymousSessionToken}`);
      return null;
    }

    // No customer cart - just assign anonymous cart to customer
    if (!customerCart) {
      await this.prisma.cart.update({
        where: { id: anonymousCart.id },
        data: { customerId },
      });

      this.logger.log(`Assigned anonymous cart ${anonymousCart.id} to customer ${customerId}`);

      return {
        mergedCartId: anonymousCart.id,
        itemsMerged: anonymousCart.items.length,
        itemsFromAnonymous: anonymousCart.items.length,
        itemsFromCustomer: 0,
        savedItemsMerged: anonymousCart.savedItems.length,
        discountsPreserved: [],
      };
    }

    // Both carts exist - need to merge
    return this.performMerge(customerCart, anonymousCart);
  }

  /**
   * Perform the actual merge of two carts
   */
  private async performMerge(
    targetCart: any,
    sourceCart: any,
  ): Promise<CartMergeResult> {
    const existingProductIds = new Set(
      targetCart.items.map((item: any) => `${item.productId}:${item.variantId || 'null'}`),
    );

    // Find items from source cart that aren't in target
    const itemsToAdd = sourceCart.items.filter(
      (item: any) => !existingProductIds.has(`${item.productId}:${item.variantId || 'null'}`),
    );

    // Find saved items from source that aren't in target
    const existingSavedProductIds = new Set(
      targetCart.savedItems.map((item: any) => `${item.productId}:${item.variantId || 'null'}`),
    );
    const savedItemsToAdd = sourceCart.savedItems.filter(
      (item: any) => !existingSavedProductIds.has(`${item.productId}:${item.variantId || 'null'}`),
    );

    // Get discount codes from source cart
    const sourceDiscounts = (sourceCart.discountCodes as string[]) || [];

    // Perform merge in transaction
    await this.prisma.$transaction(async (tx) => {
      // Move non-duplicate items to target cart
      if (itemsToAdd.length > 0) {
        await tx.cartItem.updateMany({
          where: {
            id: { in: itemsToAdd.map((i: any) => i.id) },
          },
          data: {
            cartId: targetCart.id,
          },
        });
      }

      // Move non-duplicate saved items to target cart
      if (savedItemsToAdd.length > 0) {
        await tx.savedCartItem.updateMany({
          where: {
            id: { in: savedItemsToAdd.map((i: any) => i.id) },
          },
          data: {
            cartId: targetCart.id,
          },
        });
      }

      // Mark source cart as merged
      await tx.cart.update({
        where: { id: sourceCart.id },
        data: {
          status: CartStatus.MERGED,
          mergedIntoCartId: targetCart.id,
          mergedAt: new Date(),
        },
      });

      // Update target cart totals
      await this.recalculateCartTotals(tx, targetCart.id);
    });

    this.logger.log(
      `Merged cart ${sourceCart.id} into ${targetCart.id}: ` +
        `${itemsToAdd.length} items, ${savedItemsToAdd.length} saved items`,
    );

    return {
      mergedCartId: targetCart.id,
      itemsMerged: itemsToAdd.length + savedItemsToAdd.length,
      itemsFromAnonymous: sourceCart.items.length,
      itemsFromCustomer: targetCart.items.length,
      savedItemsMerged: savedItemsToAdd.length,
      discountsPreserved: sourceDiscounts,
    };
  }

  /**
   * Sync cart state across devices for logged-in customer
   */
  async syncCartForCustomer(
    customerId: string,
    companyId: string,
    deviceSessionToken?: string,
  ): Promise<SyncResult | null> {
    // Find customer's active cart
    const cart = await this.prisma.cart.findFirst({
      where: {
        companyId,
        customerId,
        status: CartStatus.ACTIVE,
      },
      include: {
        items: true,
      },
    });

    if (!cart) {
      return null;
    }

    // If device session token provided, update it
    if (deviceSessionToken && cart.sessionToken !== deviceSessionToken) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: {
          lastActivityAt: new Date(),
        },
      });
    }

    return {
      success: true,
      cartId: cart.id,
      sessionToken: cart.sessionToken || '',
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      lastSyncedAt: new Date(),
    };
  }

  /**
   * Get cart history for customer (for cross-device continuity)
   */
  async getCartHistory(
    customerId: string,
    companyId: string,
    limit: number = 5,
  ): Promise<any[]> {
    const carts = await this.prisma.cart.findMany({
      where: {
        companyId,
        customerId,
        status: { in: [CartStatus.CONVERTED, CartStatus.ABANDONED] },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return carts.map((cart) => ({
      id: cart.id,
      status: cart.status,
      itemCount: cart.items.length,
      subtotal: Number(cart.subtotal),
      currency: cart.currency,
      convertedAt: cart.convertedAt,
      abandonedAt: cart.abandonedAt,
      items: cart.items.slice(0, 3).map((item) => ({
        productId: item.productId,
        productName: item.product?.name,
        productImage: item.product?.images?.[0],
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
    }));
  }

  /**
   * Restore items from a previous cart
   */
  async restoreFromHistory(
    cartId: string,
    customerId: string,
    companyId: string,
    itemIds?: string[],
  ): Promise<number> {
    // Find the historical cart
    const historicalCart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        customerId,
        companyId,
      },
      include: {
        items: true,
      },
    });

    if (!historicalCart) {
      return 0;
    }

    // Find or create active cart
    let activeCart = await this.prisma.cart.findFirst({
      where: {
        companyId,
        customerId,
        status: CartStatus.ACTIVE,
      },
    });

    if (!activeCart) {
      activeCart = await this.prisma.cart.create({
        data: {
          companyId,
          customerId,
          status: CartStatus.ACTIVE,
          currency: historicalCart.currency,
        },
      });
    }

    // Determine which items to restore
    const itemsToRestore = itemIds
      ? historicalCart.items.filter((item) => itemIds.includes(item.id))
      : historicalCart.items;

    // Check for existing items in active cart
    const existingItems = await this.prisma.cartItem.findMany({
      where: { cartId: activeCart.id },
    });
    const existingProductKeys = new Set(
      existingItems.map((item) => `${item.productId}:${item.variantId || 'null'}`),
    );

    // Add items that don't already exist
    let restoredCount = 0;
    for (const item of itemsToRestore) {
      const key = `${item.productId}:${item.variantId || 'null'}`;
      if (!existingProductKeys.has(key)) {
        await this.prisma.cartItem.create({
          data: {
            cartId: activeCart.id,
            productId: item.productId,
            variantId: item.variantId,
            productSnapshot: item.productSnapshot,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalPrice: item.originalPrice,
            lineTotal: item.lineTotal,
          },
        });
        restoredCount++;
      }
    }

    // Recalculate totals
    await this.recalculateCartTotals(this.prisma, activeCart.id);

    this.logger.log(
      `Restored ${restoredCount} items from cart ${cartId} to active cart ${activeCart.id}`,
    );

    return restoredCount;
  }

  /**
   * Recalculate cart totals after merge/sync
   */
  private async recalculateCartTotals(
    tx: Prisma.TransactionClient | PrismaService,
    cartId: string,
  ): Promise<void> {
    const items = await tx.cartItem.findMany({
      where: { cartId },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    await tx.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        itemCount,
        grandTotal: subtotal, // Will be recalculated with tax/shipping later
        lastActivityAt: new Date(),
      },
    });
  }
}
