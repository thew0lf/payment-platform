import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CartStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * SECURITY: Recovery token secret must be configured via environment variable.
 * This is required for production deployments to ensure cart recovery tokens
 * cannot be forged.
 */
const RECOVERY_TOKEN_SECRET = process.env.CART_RECOVERY_SECRET;
if (!RECOVERY_TOKEN_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CART_RECOVERY_SECRET environment variable is required in production');
}
// Use a test-only fallback for development/test environments
const EFFECTIVE_RECOVERY_SECRET = RECOVERY_TOKEN_SECRET || 'dev-only-recovery-secret-not-for-production';
const RECOVERY_TOKEN_EXPIRY_DAYS = 7;

export interface AbandonmentConfig {
  /** Minutes of inactivity before cart is considered at-risk */
  atRiskThresholdMinutes: number;
  /** Minutes of inactivity before cart is marked abandoned */
  abandonedThresholdMinutes: number;
  /** Whether to send recovery emails */
  enableRecoveryEmails: boolean;
  /** Hours after abandonment to send first recovery email */
  firstEmailDelayHours: number;
  /** Hours after first email to send second recovery email */
  secondEmailDelayHours: number;
  /** Maximum recovery emails to send per cart */
  maxRecoveryEmails: number;
  /** Discount code to include in recovery emails (optional) */
  recoveryDiscountCode?: string;
}

export interface AbandonedCartStats {
  totalAbandoned: number;
  totalRecovered: number;
  recoveryRate: number;
  totalRevenueLost: number;
  totalRevenueRecovered: number;
  pendingRecoveryEmails: number;
}

export interface AbandonedCartDetails {
  id: string;
  sessionToken: string;
  email?: string;
  itemCount: number;
  subtotal: number;
  currency: string;
  abandonedAt: Date;
  lastActivityAt: Date;
  recoveryEmailSent: boolean;
  recoveryEmailSentAt?: Date;
  recoveryClicks: number;
}

const DEFAULT_CONFIG: AbandonmentConfig = {
  atRiskThresholdMinutes: 30,
  abandonedThresholdMinutes: 60,
  enableRecoveryEmails: true,
  firstEmailDelayHours: 1,
  secondEmailDelayHours: 24,
  maxRecoveryEmails: 2,
};

@Injectable()
export class CartAbandonmentService {
  private readonly logger = new Logger(CartAbandonmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check for abandoned carts and mark them
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async detectAbandonedCarts(): Promise<void> {
    this.logger.debug('Running cart abandonment detection...');

    try {
      // Get all companies with active cart settings
      const companies = await this.prisma.company.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      for (const company of companies) {
        await this.detectAbandonedCartsForCompany(company.id);
      }
    } catch (error) {
      this.logger.error('Error detecting abandoned carts:', error);
    }
  }

  /**
   * Detect and mark abandoned carts for a specific company
   */
  async detectAbandonedCartsForCompany(companyId: string): Promise<number> {
    const config = await this.getConfig(companyId);
    const abandonedThreshold = new Date(
      Date.now() - config.abandonedThresholdMinutes * 60 * 1000,
    );

    // Find carts that are inactive beyond threshold
    const result = await this.prisma.cart.updateMany({
      where: {
        companyId,
        status: CartStatus.ACTIVE,
        updatedAt: { lt: abandonedThreshold },
        // Only carts with items
        items: { some: {} },
      },
      data: {
        status: CartStatus.ABANDONED,
        abandonedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Marked ${result.count} carts as abandoned for company ${companyId}`,
      );
    }

    return result.count;
  }

  /**
   * Get at-risk carts (inactive but not yet abandoned)
   */
  async getAtRiskCarts(companyId: string): Promise<AbandonedCartDetails[]> {
    const config = await this.getConfig(companyId);
    const atRiskThreshold = new Date(
      Date.now() - config.atRiskThresholdMinutes * 60 * 1000,
    );
    const abandonedThreshold = new Date(
      Date.now() - config.abandonedThresholdMinutes * 60 * 1000,
    );

    const carts = await this.prisma.cart.findMany({
      where: {
        companyId,
        status: CartStatus.ACTIVE,
        updatedAt: {
          lt: atRiskThreshold,
          gte: abandonedThreshold,
        },
        items: { some: {} },
      },
      include: {
        items: true,
        customer: { select: { email: true } },
      },
      orderBy: { updatedAt: 'asc' },
    });

    return carts.map((cart) => this.mapCartToDetails(cart));
  }

  /**
   * Get abandoned carts
   */
  async getAbandonedCarts(
    companyId: string,
    options?: {
      limit?: number;
      offset?: number;
      hasEmail?: boolean;
      maxRecoveryEmailsSent?: number;
    },
  ): Promise<AbandonedCartDetails[]> {
    const where: Prisma.CartWhereInput = {
      companyId,
      status: CartStatus.ABANDONED,
      items: { some: {} },
    };

    if (options?.hasEmail) {
      where.customer = { email: { not: null } };
    }

    if (options?.maxRecoveryEmailsSent !== undefined) {
      // Only include carts that haven't had recovery email or maxRecoveryEmailsSent is > 0
      if (options.maxRecoveryEmailsSent === 0) {
        where.recoveryEmailSent = false;
      }
    }

    const carts = await this.prisma.cart.findMany({
      where,
      include: {
        items: true,
        customer: { select: { email: true } },
      },
      orderBy: { abandonedAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return carts.map((cart) => this.mapCartToDetails(cart));
  }

  /**
   * Get abandonment statistics
   */
  async getAbandonmentStats(
    companyId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<AbandonedCartStats> {
    const dateFilter = dateRange
      ? { gte: dateRange.start, lte: dateRange.end }
      : undefined;

    // Total abandoned carts
    const [totalAbandoned, totalRecovered, pendingRecoveryEmails] =
      await Promise.all([
        this.prisma.cart.count({
          where: {
            companyId,
            status: CartStatus.ABANDONED,
            ...(dateFilter && { abandonedAt: dateFilter }),
          },
        }),
        // Recovered = carts that were abandoned then converted
        this.prisma.cart.count({
          where: {
            companyId,
            status: CartStatus.CONVERTED,
            abandonedAt: { not: null },
            ...(dateFilter && { convertedAt: dateFilter }),
          },
        }),
        // Pending recovery emails (carts that haven't received email yet)
        this.prisma.cart.count({
          where: {
            companyId,
            status: CartStatus.ABANDONED,
            OR: [
              { customer: { email: { not: null } } },
            ],
            recoveryEmailSent: false,
          },
        }),
      ]);

    // Calculate revenue metrics
    const [lostCarts, recoveredCarts] = await Promise.all([
      this.prisma.cart.findMany({
        where: {
          companyId,
          status: CartStatus.ABANDONED,
          ...(dateFilter && { abandonedAt: dateFilter }),
        },
        include: { items: true },
      }),
      this.prisma.cart.findMany({
        where: {
          companyId,
          status: CartStatus.CONVERTED,
          abandonedAt: { not: null },
          ...(dateFilter && { convertedAt: dateFilter }),
        },
        include: { items: true },
      }),
    ]);

    const totalRevenueLost = lostCarts.reduce((sum, cart) => {
      return (
        sum +
        cart.items.reduce(
          (itemSum, item) =>
            itemSum + Number(item.unitPrice) * item.quantity,
          0,
        )
      );
    }, 0);

    const totalRevenueRecovered = recoveredCarts.reduce((sum, cart) => {
      return (
        sum +
        cart.items.reduce(
          (itemSum, item) =>
            itemSum + Number(item.unitPrice) * item.quantity,
          0,
        )
      );
    }, 0);

    const recoveryRate =
      totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0;

    return {
      totalAbandoned,
      totalRecovered,
      recoveryRate,
      totalRevenueLost,
      totalRevenueRecovered,
      pendingRecoveryEmails,
    };
  }

  /**
   * Mark a cart for recovery email
   */
  async scheduleRecoveryEmail(cartId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        customer: { select: { email: true } },
      },
    });

    if (!cart) return;

    const email = cart.customer?.email;
    if (!email) {
      this.logger.debug(`Cart ${cartId} has no email for recovery`);
      return;
    }

    if (cart.recoveryEmailSent) {
      this.logger.debug(`Cart ${cartId} already has recovery email sent`);
      return;
    }

    // Log without PII - email address masked for GDPR compliance
    this.logger.log(`Cart ${cartId} is eligible for recovery email`);
  }

  /**
   * Send pending recovery emails
   * Runs every 15 minutes
   */
  @Cron('0 */15 * * * *')
  async sendPendingRecoveryEmails(): Promise<void> {
    this.logger.debug('Checking for pending recovery emails...');

    // Find abandoned carts with customer email that haven't received recovery email
    // Only send after the configured delay (1 hour by default)
    const delayThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const cartsNeedingEmail = await this.prisma.cart.findMany({
      where: {
        status: CartStatus.ABANDONED,
        recoveryEmailSent: false,
        abandonedAt: { lte: delayThreshold },
        customer: { email: { not: null } },
      },
      include: {
        items: { include: { product: true } },
        customer: { select: { email: true, firstName: true } },
        company: { select: { id: true, name: true } },
      },
      take: 100, // Process in batches
    });

    this.logger.log(`Found ${cartsNeedingEmail.length} carts needing recovery email`);

    for (const cart of cartsNeedingEmail) {
      try {
        await this.sendRecoveryEmail(cart);
      } catch (error) {
        this.logger.error(
          `Error sending recovery email for cart ${cart.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Send a recovery email for a cart
   */
  private async sendRecoveryEmail(cart: any): Promise<void> {
    const config = await this.getConfig(cart.companyId);
    const email = cart.customer?.email;
    const firstName = cart.customer?.firstName || 'there';

    if (!email || !config.enableRecoveryEmails) return;

    // Calculate recovery URL with token
    const recoveryToken = this.generateRecoveryToken(cart.id);
    const recoveryUrl = `${process.env.PORTAL_URL || 'https://checkout.avnz.io'}/recover/${recoveryToken}`;

    // TODO: Integrate with email service
    // Log without PII for GDPR compliance
    this.logger.log(`Sending recovery email for cart ${cart.id}`);
    this.logger.debug(`Recovery URL generated for cart ${cart.id}`);

    // Update cart with email sent info
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        recoveryEmailSent: true,
        recoveryEmailSentAt: new Date(),
      },
    });
  }

  /**
   * Recover an abandoned cart via token
   */
  async recoverCart(recoveryToken: string): Promise<string | null> {
    const cartId = this.decodeRecoveryToken(recoveryToken);
    if (!cartId) return null;

    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        status: CartStatus.ABANDONED,
      },
    });

    if (!cart) return null;

    // Reactivate the cart
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status: CartStatus.ACTIVE,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Cart ${cartId} recovered via email link`);

    return cart.sessionToken;
  }

  /**
   * Get company abandonment config
   */
  private async getConfig(companyId: string): Promise<AbandonmentConfig> {
    // TODO: Load from company settings
    // For now, return defaults
    return DEFAULT_CONFIG;
  }

  /**
   * Generate a secure HMAC-signed recovery token for a cart
   */
  private generateRecoveryToken(cartId: string): string {
    const expiresAt = Date.now() + RECOVERY_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const payload = `${cartId}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', EFFECTIVE_RECOVERY_SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter URL

    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  /**
   * Decode and validate a recovery token
   * Returns cartId if valid, null if invalid or expired
   */
  private decodeRecoveryToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');

      if (parts.length !== 3) return null;

      const [cartId, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);

      // Check expiration
      if (isNaN(expiresAt) || Date.now() > expiresAt) {
        this.logger.debug(`Recovery token expired for cart ${cartId}`);
        return null;
      }

      // Verify signature
      const payload = `${cartId}:${expiresAtStr}`;
      const expectedSignature = crypto
        .createHmac('sha256', EFFECTIVE_RECOVERY_SECRET)
        .update(payload)
        .digest('hex')
        .substring(0, 16);

      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )) {
        this.logger.warn(`Invalid recovery token signature for cart ${cartId}`);
        return null;
      }

      return cartId;
    } catch {
      return null;
    }
  }

  /**
   * Map a cart to AbandonedCartDetails
   */
  private mapCartToDetails(cart: any): AbandonedCartDetails {
    return {
      id: cart.id,
      sessionToken: cart.sessionToken,
      email: cart.customer?.email,
      itemCount: cart.items?.length || 0,
      subtotal: cart.items?.reduce(
        (sum: number, item: any) =>
          sum + Number(item.unitPrice) * item.quantity,
        0,
      ) || 0,
      currency: cart.currency || 'USD',
      abandonedAt: cart.abandonedAt || cart.updatedAt,
      lastActivityAt: cart.lastActivityAt || cart.updatedAt,
      recoveryEmailSent: cart.recoveryEmailSent || false,
      recoveryEmailSentAt: cart.recoveryEmailSentAt,
      recoveryClicks: cart.recoveryClicks || 0,
    };
  }
}
