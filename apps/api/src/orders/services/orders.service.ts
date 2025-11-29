import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { OrderNumberService } from './order-number.service';
import {
  Order,
  OrderItem,
  OrderStats,
  isValidStatusTransition,
} from '../types/order.types';
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
} from '../dto/order.dto';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderNumberService: OrderNumberService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateOrderDto, userId: string): Promise<Order> {
    // Check for idempotency via externalId
    if (dto.externalId) {
      const existing = await this.prisma.order.findFirst({
        where: { companyId, externalId: dto.externalId },
        include: { items: true, shipments: { include: { events: true } } },
      });
      if (existing) {
        this.logger.log(`Returning existing order for externalId: ${dto.externalId}`);
        return this.mapToOrder(existing);
      }
    }

    const orderNumber = await this.orderNumberService.generate(companyId);

    // Fetch product snapshots if productIds provided
    const productIds = dto.items.filter(i => i.productId).map(i => i.productId as string);
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate totals and build items
    let subtotal = 0;
    const itemsData: Prisma.OrderItemCreateWithoutOrderInput[] = dto.items.map((item) => {
      const product = item.productId ? productMap.get(item.productId) : null;
      const itemTotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      subtotal += itemTotal;

      return {
        sku: item.sku,
        name: item.name,
        description: item.description,
        productId: item.productId,
        productSnapshot: product
          ? { sku: product.sku, name: product.name, price: Number(product.price) }
          : {},
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        taxAmount: item.taxAmount || 0,
        totalPrice: itemTotal + (item.taxAmount || 0),
        fulfilledQuantity: 0,
        fulfillmentStatus: 'UNFULFILLED',
      };
    });

    const taxAmount = itemsData.reduce((sum, item) => sum + Number(item.taxAmount), 0);
    const discountAmount = dto.discountCode ? 0 : 0; // Discount logic would go here
    const shippingAmount = dto.shippingAmount || 0;
    const total = subtotal - discountAmount + shippingAmount + taxAmount;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          companyId,
          customerId: dto.customerId,
          subscriptionId: dto.subscriptionId,
          billingAccountId: dto.billingAccountId,
          orderNumber,
          externalId: dto.externalId,
          type: dto.type || 'ONE_TIME',
          status: 'PENDING',

          shippingSnapshot: dto.shippingAddress as unknown as Prisma.JsonObject,
          billingSnapshot: (dto.billingAddress || dto.shippingAddress) as unknown as Prisma.JsonObject,

          subtotal,
          discountAmount,
          discountCode: dto.discountCode,
          shippingAmount,
          taxAmount,
          total,
          currency: dto.currency || 'USD',

          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',

          customerNotes: dto.customerNotes,
          internalNotes: dto.internalNotes,
          metadata: (dto.metadata || {}) as Prisma.JsonObject,

          items: {
            create: itemsData,
          },
        },
        include: { items: true, shipments: true },
      });

      return created;
    });

    this.logger.log(`Created order: ${orderNumber} (${order.id}) by user ${userId}`);
    this.eventEmitter.emit('order.created', { order: this.mapToOrder(order), userId });

    return this.mapToOrder(order);
  }

  // ═══════════════════════════════════════════════════════════════
  // READ
  // ═══════════════════════════════════════════════════════════════

  async findAll(
    companyId: string | undefined,
    query: OrderQueryDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const where: Prisma.OrderWhereInput = {};

    // Only filter by companyId if provided (undefined = all orders for org/client admins)
    if (companyId) {
      where.companyId = companyId;
    }

    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status as any;
    if (query.fulfillmentStatus) where.fulfillmentStatus = query.fulfillmentStatus as any;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus as any;
    if (query.type) where.type = query.type as any;

    if (query.startDate || query.endDate) {
      where.orderedAt = {};
      if (query.startDate) where.orderedAt.gte = new Date(query.startDate);
      if (query.endDate) where.orderedAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { externalId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(query.limit || 50, MAX_PAGE_SIZE);
    const offset = query.offset || 0;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, shipments: { include: { events: true } } },
        orderBy: { orderedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(this.mapToOrder.bind(this)),
      total,
    };
  }

  async findById(id: string, companyId: string): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: {
        items: true,
        shipments: { include: { events: { orderBy: { occurredAt: 'desc' } } } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return this.mapToOrder(order);
  }

  async findByOrderNumber(orderNumber: string, companyId: string): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, companyId },
      include: {
        items: true,
        shipments: { include: { events: { orderBy: { occurredAt: 'desc' } } } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    return this.mapToOrder(order);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════

  async update(id: string, companyId: string, dto: UpdateOrderDto, userId: string): Promise<Order> {
    const existing = await this.prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Check if address is locked
    if ((dto.shippingAddress || dto.billingAddress) && existing.addressLockedAt) {
      throw new BadRequestException('Cannot modify address after fulfillment has started');
    }

    const updateData: Prisma.OrderUpdateInput = {};

    if (dto.shippingAddress) updateData.shippingSnapshot = dto.shippingAddress as unknown as Prisma.JsonObject;
    if (dto.billingAddress) updateData.billingSnapshot = dto.billingAddress as unknown as Prisma.JsonObject;
    if (dto.shippingAmount !== undefined) updateData.shippingAmount = dto.shippingAmount;
    if (dto.discountCode !== undefined) updateData.discountCode = dto.discountCode;
    if (dto.discountAmount !== undefined) updateData.discountAmount = dto.discountAmount;
    if (dto.customerNotes !== undefined) updateData.customerNotes = dto.customerNotes;
    if (dto.internalNotes !== undefined) updateData.internalNotes = dto.internalNotes;
    if (dto.metadata) updateData.metadata = dto.metadata as Prisma.JsonObject;

    // Recalculate total if amounts changed
    if (dto.shippingAmount !== undefined || dto.discountAmount !== undefined) {
      const subtotal = Number(existing.subtotal);
      const tax = Number(existing.taxAmount);
      const shipping = dto.shippingAmount ?? Number(existing.shippingAmount);
      const discount = dto.discountAmount ?? Number(existing.discountAmount);
      updateData.total = subtotal - discount + shipping + tax;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true, shipments: true },
    });

    this.logger.log(`Updated order: ${updated.orderNumber} by user ${userId}`);
    this.eventEmitter.emit('order.updated', { order: this.mapToOrder(updated), userId });

    return this.mapToOrder(updated);
  }

  async updateStatus(
    id: string,
    companyId: string,
    newStatus: string,
    userId: string,
    reason?: string,
  ): Promise<Order> {
    const existing = await this.prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Validate state transition
    if (!isValidStatusTransition(existing.status, newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.status} to ${newStatus}`,
      );
    }

    const updateData: Prisma.OrderUpdateInput = { status: newStatus as any };

    if (newStatus === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    } else if (newStatus === 'CANCELED') {
      updateData.canceledAt = new Date();
      updateData.cancelReason = reason;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true, shipments: true },
    });

    this.eventEmitter.emit('order.status_changed', {
      order: this.mapToOrder(updated),
      previousStatus: existing.status,
      newStatus,
      userId,
    });

    return this.mapToOrder(updated);
  }

  // ═══════════════════════════════════════════════════════════════
  // ADDRESS LOCKING
  // ═══════════════════════════════════════════════════════════════

  async lockAddress(id: string, companyId: string, lockedBy: string): Promise<Order> {
    const existing = await this.prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (existing.addressLockedAt) {
      throw new ConflictException('Address is already locked');
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        addressLockedAt: new Date(),
        addressLockedBy: lockedBy,
      },
      include: { items: true, shipments: true },
    });

    this.logger.log(`Locked address for order: ${order.orderNumber}`);
    return this.mapToOrder(order);
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT
  // ═══════════════════════════════════════════════════════════════

  async markPaid(id: string, companyId: string, userId: string, paymentMethod?: string): Promise<Order> {
    const existing = await this.prisma.order.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (existing.paymentStatus === 'PAID') {
      throw new ConflictException('Order is already paid');
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paidAt: new Date(),
        paymentMethod,
        status: existing.status === 'PENDING' ? 'CONFIRMED' : existing.status,
        confirmedAt: existing.status === 'PENDING' ? new Date() : existing.confirmedAt,
      },
      include: { items: true, shipments: true },
    });

    this.eventEmitter.emit('order.paid', { order: this.mapToOrder(order), userId });
    return this.mapToOrder(order);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════

  async getStats(companyId: string, startDate?: Date, endDate?: Date): Promise<OrderStats> {
    const where: Prisma.OrderWhereInput = { companyId };

    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) where.orderedAt.gte = startDate;
      if (endDate) where.orderedAt.lte = endDate;
    }

    // Use groupBy for efficiency instead of multiple count queries
    const [statusCounts, revenueData] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const statusMap = new Map(statusCounts.map((s) => [s.status, s._count]));
    const totalOrders = statusCounts.reduce((sum, s) => sum + s._count, 0);
    const totalRevenue = Number(revenueData._sum.total || 0);

    return {
      totalOrders,
      pendingOrders: statusMap.get('PENDING') || 0,
      processingOrders: statusMap.get('PROCESSING') || 0,
      completedOrders: statusMap.get('COMPLETED') || 0,
      canceledOrders: statusMap.get('CANCELED') || 0,
      totalRevenue,
      averageOrderValue: revenueData._count > 0 ? totalRevenue / revenueData._count : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPING
  // ═══════════════════════════════════════════════════════════════

  private mapToOrder(data: any): Order {
    return {
      id: data.id,
      companyId: data.companyId,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId,
      billingAccountId: data.billingAccountId,
      orderNumber: data.orderNumber,
      externalId: data.externalId,
      type: data.type,
      status: data.status,
      shippingSnapshot: data.shippingSnapshot as Record<string, unknown>,
      shippingAddressId: data.shippingAddressId,
      billingSnapshot: data.billingSnapshot as Record<string, unknown>,
      billingAddressId: data.billingAddressId,
      addressLockedAt: data.addressLockedAt,
      addressLockedBy: data.addressLockedBy,
      subtotal: Number(data.subtotal),
      discountAmount: Number(data.discountAmount),
      discountCode: data.discountCode,
      shippingAmount: Number(data.shippingAmount),
      taxAmount: Number(data.taxAmount),
      total: Number(data.total),
      currency: data.currency,
      paymentStatus: data.paymentStatus,
      paidAt: data.paidAt,
      paymentMethod: data.paymentMethod,
      fulfillmentStatus: data.fulfillmentStatus,
      fulfilledAt: data.fulfilledAt,
      customerNotes: data.customerNotes,
      internalNotes: data.internalNotes,
      metadata: data.metadata as Record<string, unknown>,
      orderedAt: data.orderedAt,
      confirmedAt: data.confirmedAt,
      canceledAt: data.canceledAt,
      cancelReason: data.cancelReason,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      items: data.items?.map(this.mapToOrderItem.bind(this)),
      shipments: data.shipments?.map(this.mapToShipment.bind(this)),
    };
  }

  private mapToOrderItem(data: any): OrderItem {
    return {
      id: data.id,
      orderId: data.orderId,
      productId: data.productId,
      sku: data.sku,
      name: data.name,
      description: data.description,
      productSnapshot: data.productSnapshot as Record<string, unknown>,
      quantity: data.quantity,
      unitPrice: Number(data.unitPrice),
      discountAmount: Number(data.discountAmount),
      taxAmount: Number(data.taxAmount),
      totalPrice: Number(data.totalPrice),
      fulfilledQuantity: data.fulfilledQuantity,
      fulfillmentStatus: data.fulfillmentStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapToShipment(data: any): any {
    return {
      id: data.id,
      orderId: data.orderId,
      shipmentNumber: data.shipmentNumber,
      carrier: data.carrier,
      carrierService: data.carrierService,
      trackingNumber: data.trackingNumber,
      trackingUrl: data.trackingUrl,
      shippingMethod: data.shippingMethod,
      status: data.status,
      shippedAt: data.shippedAt,
      deliveredAt: data.deliveredAt,
      events: data.events,
    };
  }
}
