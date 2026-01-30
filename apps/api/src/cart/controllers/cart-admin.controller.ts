import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { CartService } from '../services/cart.service';
import { CartAbandonmentService, AbandonedCartDetails, AbandonedCartStats } from '../services/cart-abandonment.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmailService } from '../../email/services/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { CartData, CartStatus } from '../types/cart.types';
import {
  CartAdminQueryDto,
  CartStatsQueryDto,
  AbandonedCartsQueryDto,
  CartActivityQueryDto,
  SendRecoveryEmailDto,
} from '../dto/cart-admin.dto';
import { DataClassification, CartStatus as PrismaCartStatus, Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CartListResponse {
  carts: CartData[];
  total: number;
  limit: number;
  offset: number;
}

export interface CartStats {
  totalCarts: number;
  activeCarts: number;
  abandonedCarts: number;
  convertedCarts: number;
  expiredCarts: number;
  totalValue: number;
  totalAbandonedValue: number;
  averageCartValue: number;
  abandonmentRate: number;
  conversionRate: number;
  recoveryRate: number;
}

export interface CartActivity {
  id: string;
  action: string;
  timestamp: Date;
  details: Record<string, unknown>;
  userId?: string;
  userName?: string;
}

export interface CartWithDetails {
  id: string;
  companyId: string;
  sessionToken: string;
  status: string;
  currency: string;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    grandTotal: number;
    itemCount: number;
    currency: string;
  };
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product?: {
      id: string;
      name: string;
      sku?: string;
      images?: unknown;
    };
  }>;
  funnel?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  abandonedAt?: Date;
  convertedAt?: Date;
  recoveryEmailSent: boolean;
  recoveryEmailSentAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

@Controller('admin/carts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CartAdminController {
  private readonly logger = new Logger(CartAdminController.name);

  constructor(
    private readonly cartService: CartService,
    private readonly cartAbandonmentService: CartAbandonmentService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // LIST CARTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * List carts with filters, pagination, and sorting
   * Supports filtering by status, date range, value range, funnel, and search
   */
  @Get()
  async findAll(
    @Query() query: CartAdminQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartListResponse> {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);

    const where: Prisma.CartWhereInput = {
      ...(companyId && { companyId }),
    };

    // SECURITY: Client boundary validation for ORG/CLIENT admins viewing all
    // Prevents cross-client data leakage when companyId is undefined
    if (!companyId && user.clientId) {
      where.company = { clientId: user.clientId };
    }

    // Status filter
    if (query.status) {
      where.status = query.status as PrismaCartStatus;
    }

    // Date range filter with validation
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      if (startDate > endDate) {
        throw new BadRequestException('Oops! The start date should be before the end date. Try swapping them.');
      }
      where.createdAt = { gte: startDate, lte: endDate };
    } else if (query.startDate) {
      where.createdAt = { ...(where.createdAt as object), gte: new Date(query.startDate) };
    } else if (query.endDate) {
      where.createdAt = { ...(where.createdAt as object), lte: new Date(query.endDate) };
    }

    // Value range filter
    if (query.minValue !== undefined) {
      where.grandTotal = { ...(where.grandTotal as object), gte: query.minValue };
    }
    if (query.maxValue !== undefined) {
      where.grandTotal = { ...(where.grandTotal as object), lte: query.maxValue };
    }

    // Has customer filter
    if (query.hasCustomer !== undefined) {
      if (query.hasCustomer) {
        where.customerId = { not: null };
      } else {
        where.customerId = null;
      }
    }

    // Search filter (searches customer email, session token)
    if (query.search) {
      where.OR = [
        { sessionToken: { contains: query.search, mode: 'insensitive' } },
        { customer: { email: { contains: query.search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    // Pagination
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.CartOrderByWithRelationInput = { [sortBy]: sortOrder };

    // Execute query
    const [carts, total] = await Promise.all([
      this.prisma.cart.findMany({
        where,
        include: {
          items: {
            include: { product: true },
            orderBy: { addedAt: 'asc' },
          },
          savedItems: {
            include: { product: true },
            orderBy: { savedAt: 'asc' },
          },
          customer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          funnelSessions: {
            include: {
              funnel: {
                select: { id: true, name: true, slug: true, shortId: true },
              },
            },
            take: 1,
            orderBy: { startedAt: 'desc' },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.cart.count({ where }),
    ]);

    // Map to CartData format
    const cartDataList = carts.map((cart) => this.mapCartToResponse(cart));

    return {
      carts: cartDataList,
      total,
      limit,
      offset,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CART STATISTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get cart statistics including counts, values, and rates
   */
  @Get('stats')
  async getStats(
    @Query() query: CartStatsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartStats> {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);

    // Validate date range
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      if (startDate > endDate) {
        throw new BadRequestException('Oops! The start date should be before the end date. Try swapping them.');
      }
    }

    const dateFilter: Prisma.DateTimeFilter | undefined = query.startDate || query.endDate
      ? {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        }
      : undefined;

    const baseWhere: Prisma.CartWhereInput = {
      ...(companyId && { companyId }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    // SECURITY: Client boundary validation for ORG/CLIENT admins viewing all
    // Prevents cross-client data leakage when companyId is undefined
    if (!companyId && user.clientId) {
      baseWhere.company = { clientId: user.clientId };
    }

    // Get counts by status
    const [
      totalCarts,
      activeCarts,
      abandonedCarts,
      convertedCarts,
      expiredCarts,
      recoveredCarts,
    ] = await Promise.all([
      this.prisma.cart.count({ where: baseWhere }),
      this.prisma.cart.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      this.prisma.cart.count({ where: { ...baseWhere, status: 'ABANDONED' } }),
      this.prisma.cart.count({ where: { ...baseWhere, status: 'CONVERTED' } }),
      this.prisma.cart.count({ where: { ...baseWhere, status: 'EXPIRED' } }),
      // Recovered = carts that were abandoned then converted
      this.prisma.cart.count({
        where: {
          ...baseWhere,
          status: 'CONVERTED',
          abandonedAt: { not: null },
        },
      }),
    ]);

    // Get value aggregations
    const [valueStats, abandonedValueStats] = await Promise.all([
      this.prisma.cart.aggregate({
        where: baseWhere,
        _sum: { grandTotal: true },
        _avg: { grandTotal: true },
      }),
      this.prisma.cart.aggregate({
        where: { ...baseWhere, status: 'ABANDONED' },
        _sum: { grandTotal: true },
      }),
    ]);

    const totalValue = Number(valueStats._sum.grandTotal || 0);
    const totalAbandonedValue = Number(abandonedValueStats._sum.grandTotal || 0);
    const averageCartValue = Number(valueStats._avg.grandTotal || 0);

    // Calculate rates
    const abandonmentRate = totalCarts > 0
      ? (abandonedCarts / (abandonedCarts + convertedCarts)) * 100
      : 0;
    const conversionRate = totalCarts > 0
      ? (convertedCarts / totalCarts) * 100
      : 0;
    const recoveryRate = abandonedCarts > 0
      ? (recoveredCarts / abandonedCarts) * 100
      : 0;

    return {
      totalCarts,
      activeCarts,
      abandonedCarts,
      convertedCarts,
      expiredCarts,
      totalValue,
      totalAbandonedValue,
      averageCartValue: Math.round(averageCartValue * 100) / 100,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ABANDONED CARTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * List abandoned carts eligible for recovery
   * Returns carts that have customer email and haven't reached max recovery emails
   */
  @Get('abandoned')
  async getAbandonedCarts(
    @Query() query: AbandonedCartsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ carts: AbandonedCartDetails[]; total: number }> {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);

    if (!companyId) {
      throw new BadRequestException('Heads up! Please select a company from the sidebar to view abandoned carts.');
    }

    const carts = await this.cartAbandonmentService.getAbandonedCarts(companyId, {
      limit: query.limit || 50,
      offset: query.offset || 0,
      hasEmail: query.hasEmail,
      maxRecoveryEmailsSent: query.maxRecoveryEmailsSent,
    });

    // Get total count for pagination
    const where: Prisma.CartWhereInput = {
      companyId,
      status: 'ABANDONED',
      items: { some: {} },
    };

    if (query.hasEmail) {
      where.customerId = { not: null };
      where.customer = { is: { email: { not: null } } };
    }

    if (query.maxRecoveryEmailsSent === 0) {
      where.recoveryEmailSent = false;
    }

    const total = await this.prisma.cart.count({ where });

    return { carts, total };
  }

  // ═══════════════════════════════════════════════════════════════
  // GET CART BY ID
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a cart by ID with full details including items, customer, and product info
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartWithDetails> {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, images: true },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
        customer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        funnelSessions: {
          include: {
            funnel: {
              select: { id: true, name: true, slug: true, shortId: true },
            },
          },
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('We couldn\'t find that cart. It may have been archived or removed.');
    }

    // Validate company access
    await this.validateCompanyAccess(user, cart.companyId);

    return this.mapToCartWithDetails(cart);
  }

  // ═══════════════════════════════════════════════════════════════
  // CART ACTIVITY TIMELINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get activity timeline for a cart
   * Returns audit log entries related to the cart
   */
  @Get(':id/activity')
  async getActivity(
    @Param('id') id: string,
    @Query() query: CartActivityQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ activities: CartActivity[]; total: number }> {
    // First verify the cart exists and user has access
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    });

    if (!cart) {
      throw new NotFoundException('We couldn\'t find that cart. It may have been archived or removed.');
    }

    await this.validateCompanyAccess(user, cart.companyId);

    // Get audit logs for this cart
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          entity: 'Cart',
          entityId: id,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({
        where: {
          entity: 'Cart',
          entityId: id,
        },
      }),
    ]);

    // Also get cart item audit logs
    const itemLogs = await this.prisma.auditLog.findMany({
      where: {
        entity: 'CartItem',
        OR: [
          { entityId: id },
          { metadata: { path: ['cartId'], equals: id } },
        ],
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Combine and sort activities
    const allLogs = [...logs, ...itemLogs].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const activities: CartActivity[] = allLogs.slice(0, limit).map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      details: {
        entity: log.entity,
        changes: log.changes as Record<string, unknown> | undefined,
        metadata: log.metadata as Record<string, unknown> | undefined,
      },
      userId: log.userId || undefined,
      userName: log.user
        ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email
        : undefined,
    }));

    return { activities, total: total + itemLogs.length };
  }

  // ═══════════════════════════════════════════════════════════════
  // SEND RECOVERY EMAIL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a recovery email for an abandoned cart
   * Requires the cart to be abandoned and have a customer email
   */
  @Post(':id/recovery')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async sendRecoveryEmail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    // Get cart with customer info
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
          },
        },
        customer: { select: { id: true, email: true, firstName: true } },
        company: { select: { id: true, name: true } },
      },
    });

    if (!cart) {
      throw new NotFoundException('We couldn\'t find that cart. It may have been archived or removed.');
    }

    await this.validateCompanyAccess(user, cart.companyId);

    // Validate cart is abandoned
    if (cart.status !== 'ABANDONED') {
      throw new BadRequestException('This cart isn\'t abandoned yet. Recovery emails can only be sent for abandoned carts.');
    }

    // Validate cart has customer email
    const email = cart.customer?.email;
    if (!email) {
      throw new BadRequestException('This cart doesn\'t have a customer email on file. We need an email to send the recovery message.');
    }

    // Generate recovery URL (using cart-abandonment service for token)
    const portalUrl = process.env.PORTAL_URL || 'https://checkout.avnz.io';
    const recoveryUrl = `${portalUrl}/recover/${cart.sessionToken}`;

    // Calculate cart summary for email
    const cartSummary = {
      itemCount: cart.items.length,
      subtotal: Number(cart.subtotal),
      grandTotal: Number(cart.grandTotal),
      items: cart.items.slice(0, 3).map((item) => ({
        name: (item.productSnapshot as { name?: string })?.name || item.product?.name || 'Product',
        quantity: item.quantity,
        price: Number(item.unitPrice),
        image: (item.product?.images as { url?: string }[])?.[0]?.url,
      })),
    };

    // Send recovery email using templated email
    const result = await this.emailService.sendTemplatedEmail({
      to: email,
      toName: cart.customer?.firstName,
      templateCode: 'cart-recovery',
      variables: {
        firstName: cart.customer?.firstName || 'there',
        companyName: cart.company?.name || 'Our Store',
        recoveryUrl,
        itemCount: cartSummary.itemCount,
        subtotal: cartSummary.subtotal.toFixed(2),
        grandTotal: cartSummary.grandTotal.toFixed(2),
        items: cartSummary.items,
        currency: cart.currency || 'USD',
      },
      companyId: cart.companyId,
    });

    // Update cart with recovery email info
    await this.prisma.cart.update({
      where: { id },
      data: {
        recoveryEmailSent: true,
        recoveryEmailSentAt: new Date(),
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.EMAIL_SENT,
      'Cart',
      id,
      {
        userId: user.id,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          action: 'recovery_email_sent',
          recipientMasked: this.maskEmail(email),
          cartValue: cartSummary.grandTotal,
          itemCount: cartSummary.itemCount,
        },
      },
    );

    this.logger.log(`Recovery email sent for cart ${id} by user ${user.id}`);

    return {
      success: result.success,
      message: result.success
        ? 'Recovery email sent successfully'
        : `Failed to send recovery email: ${result.error}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ARCHIVE CART
  // ═══════════════════════════════════════════════════════════════

  /**
   * Archive a cart (soft delete)
   * Archived carts are hidden from normal queries but can be restored
   */
  @Post(':id/archive')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async archiveCart(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      select: { id: true, companyId: true, status: true, grandTotal: true },
    });

    if (!cart) {
      throw new NotFoundException('We couldn\'t find that cart. It may have already been archived or removed.');
    }

    await this.validateCompanyAccess(user, cart.companyId);

    // Cannot archive converted carts (they're linked to orders)
    if (cart.status === 'CONVERTED') {
      throw new BadRequestException('This cart became an order and can\'t be archived. Check the orders section instead!');
    }

    // Already archived (expired) check
    if (cart.status === 'EXPIRED') {
      throw new BadRequestException('Good news - this cart is already archived!');
    }

    // Archive the cart by setting status to EXPIRED
    // Note: Using EXPIRED status as the archive mechanism since Cart model doesn't have archivedAt field
    await this.prisma.cart.update({
      where: { id },
      data: {
        status: 'EXPIRED',
        expiresAt: new Date(),
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.ARCHIVE,
      'Cart',
      id,
      {
        userId: user.id,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          previousStatus: cart.status,
          cartValue: Number(cart.grandTotal),
        },
      },
    );

    this.logger.log(`Cart ${id} archived by user ${user.id}`);

    return {
      success: true,
      message: 'Cart archived successfully',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get companyId for query operations
   * For ORGANIZATION/CLIENT scope users, allows filtering or returns undefined for all
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    if (user.companyId) {
      return user.companyId;
    }

    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          {
            sub: user.id,
            scopeType: user.scopeType as any,
            scopeId: user.scopeId,
            clientId: user.clientId,
            companyId: user.companyId,
          },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Hmm, you don\'t have access to that company. Double-check your permissions or try a different one.');
        }
        return queryCompanyId;
      }
      return undefined;
    }

    throw new ForbiddenException('We couldn\'t figure out which company to use. Please select one from the sidebar.');
  }

  /**
   * Validate company access for a specific cart
   */
  private async validateCompanyAccess(
    user: AuthenticatedUser,
    companyId: string,
  ): Promise<void> {
    if (user.scopeType === 'ORGANIZATION') {
      return;
    }

    if (user.scopeType === 'COMPANY' && user.scopeId === companyId) {
      return;
    }

    if (user.companyId === companyId) {
      return;
    }

    const hasAccess = await this.hierarchyService.canAccessCompany(
      {
        sub: user.id,
        scopeType: user.scopeType as any,
        scopeId: user.scopeId,
        clientId: user.clientId,
        companyId: user.companyId,
      },
      companyId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You don\'t have permission to view this cart. Need access? Contact your admin.');
    }
  }

  /**
   * Map Prisma cart to CartData response format
   */
  private mapCartToResponse(cart: any): CartData {
    // Extract funnel from funnelSessions if available
    const funnelSession = cart.funnelSessions?.[0];
    const funnel = funnelSession?.funnel;

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
      discountCodes: (cart.discountCodes as any[]) || [],
      items: cart.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || undefined,
        productSnapshot: item.productSnapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        originalPrice: Number(item.originalPrice),
        discountAmount: Number(item.discountAmount),
        lineTotal: Number(item.lineTotal),
        customFields: item.customFields,
        giftMessage: item.giftMessage || undefined,
        isGift: item.isGift,
        addedAt: item.addedAt,
      })) || [],
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
      metadata: cart.metadata || {},
      utmSource: cart.utmSource || undefined,
      utmMedium: cart.utmMedium || undefined,
      utmCampaign: cart.utmCampaign || undefined,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      lastActivityAt: cart.lastActivityAt,
      expiresAt: cart.expiresAt || undefined,
      funnel: funnel ? {
        id: funnel.id,
        name: funnel.name,
        slug: funnel.shortId || funnel.slug,
      } : undefined,
    };
  }

  /**
   * Map Prisma cart to CartWithDetails response format
   */
  private mapToCartWithDetails(cart: any): CartWithDetails {
    // Extract funnel from funnelSessions if available
    const funnelSession = cart.funnelSessions?.[0];
    const funnel = funnelSession?.funnel;

    return {
      id: cart.id,
      companyId: cart.companyId,
      sessionToken: cart.sessionToken,
      status: cart.status,
      currency: cart.currency,
      totals: {
        subtotal: Number(cart.subtotal),
        discount: Number(cart.discountTotal),
        shipping: Number(cart.shippingTotal),
        tax: Number(cart.taxTotal),
        grandTotal: Number(cart.grandTotal),
        itemCount: cart.itemCount,
        currency: cart.currency,
      },
      customer: cart.customer
        ? {
            id: cart.customer.id,
            email: cart.customer.email,
            firstName: cart.customer.firstName || undefined,
            lastName: cart.customer.lastName || undefined,
          }
        : undefined,
      items: cart.items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              sku: item.product.sku || undefined,
              images: item.product.images,
            }
          : undefined,
      })) || [],
      funnel: funnel ? {
        id: funnel.id,
        name: funnel.name,
        slug: funnel.shortId || funnel.slug,
      } : undefined,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      lastActivityAt: cart.lastActivityAt,
      abandonedAt: cart.abandonedAt || undefined,
      convertedAt: cart.convertedAt || undefined,
      recoveryEmailSent: cart.recoveryEmailSent || false,
      recoveryEmailSentAt: cart.recoveryEmailSentAt || undefined,
    };
  }

  /**
   * Mask email for audit logging (GDPR compliance)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local.length > 2
      ? `${local[0]}***${local[local.length - 1]}`
      : '***';
    return `${maskedLocal}@${domain}`;
  }
}
