import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { OrderNumberService } from '../../orders/services/order-number.service';
import { Shipment, ShipmentEvent } from '../types/fulfillment.types';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
} from '../dto/shipment.dto';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderNumberService: OrderNumberService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateShipmentDto, userId: string): Promise<Shipment> {
    // Verify order exists and belongs to company
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    if (order.status === 'CANCELED') {
      throw new BadRequestException('Cannot create shipment for canceled order');
    }

    const shipmentNumber = await this.orderNumberService.generateShipmentNumber(companyId);

    // Use transaction to create shipment and lock address atomically
    const shipment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          orderId: dto.orderId,
          shipmentNumber,
          carrier: dto.carrier,
          carrierService: dto.carrierService,
          shippingMethod: dto.shippingMethod || 'GROUND',
          trackingNumber: dto.trackingNumber,
          weight: dto.weight,
          length: dto.length,
          width: dto.width,
          height: dto.height,
          shippingCost: dto.shippingCost,
          insuranceAmount: dto.insuranceAmount,
          shippingAddressSnapshot: order.shippingSnapshot as Prisma.JsonObject,
          status: 'PENDING',
          estimatedShipDate: dto.estimatedShipDate ? new Date(dto.estimatedShipDate) : undefined,
          estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
          signatureRequired: dto.signatureRequired || false,
        },
        include: { events: true },
      });

      // Lock order address if not already locked
      if (!order.addressLockedAt) {
        await tx.order.update({
          where: { id: dto.orderId },
          data: {
            addressLockedAt: new Date(),
            addressLockedBy: 'fulfillment',
            status: order.status === 'CONFIRMED' ? 'PROCESSING' : order.status,
          },
        });
      }

      return created;
    });

    this.logger.log(`Created shipment: ${shipmentNumber} for order ${order.orderNumber} by user ${userId}`);
    this.eventEmitter.emit('shipment.created', { shipment: this.mapToShipment(shipment), userId });

    return this.mapToShipment(shipment);
  }

  // ═══════════════════════════════════════════════════════════════
  // READ
  // ═══════════════════════════════════════════════════════════════

  async findByOrderId(orderId: string, companyId: string): Promise<Shipment[]> {
    // Verify order belongs to company
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, companyId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const shipments = await this.prisma.shipment.findMany({
      where: { orderId },
      include: { events: { orderBy: { occurredAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return shipments.map(this.mapToShipment.bind(this));
  }

  async findById(id: string, companyId: string): Promise<Shipment> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        order: { select: { companyId: true } },
      },
    });

    if (!shipment || shipment.order.companyId !== companyId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return this.mapToShipment(shipment);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════

  async update(id: string, companyId: string, dto: UpdateShipmentDto, userId: string): Promise<Shipment> {
    // Verify shipment exists and belongs to company
    const existing = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { companyId: true } } },
    });

    if (!existing || existing.order.companyId !== companyId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        carrier: dto.carrier,
        carrierService: dto.carrierService,
        trackingNumber: dto.trackingNumber,
        trackingUrl: dto.trackingUrl,
        shippingLabelUrl: dto.shippingLabelUrl,
        returnLabelUrl: dto.returnLabelUrl,
        estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
      },
      include: { events: true },
    });

    this.logger.log(`Updated shipment: ${shipment.shipmentNumber} by user ${userId}`);
    this.eventEmitter.emit('shipment.updated', { shipment: this.mapToShipment(shipment), userId });

    return this.mapToShipment(shipment);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS ACTIONS
  // ═══════════════════════════════════════════════════════════════

  async markShipped(id: string, companyId: string, userId: string, trackingNumber?: string): Promise<Shipment> {
    const existing = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { companyId: true, id: true } } },
    });

    if (!existing || existing.order.companyId !== companyId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    if (existing.status !== 'PENDING' && existing.status !== 'LABEL_CREATED') {
      throw new BadRequestException(`Cannot ship from status ${existing.status}`);
    }

    const shipment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id },
        data: {
          status: 'IN_TRANSIT',
          shippedAt: new Date(),
          trackingNumber: trackingNumber || existing.trackingNumber,
        },
        include: { events: true },
      });

      // Add tracking event
      await tx.shipmentEvent.create({
        data: {
          shipmentId: id,
          status: 'PICKED_UP',
          description: 'Package picked up by carrier',
          occurredAt: new Date(),
        },
      });

      // Update order fulfillment status
      await this.updateOrderFulfillmentStatus(tx, existing.order.id);

      return updated;
    });

    this.logger.log(`Marked shipment shipped: ${shipment.shipmentNumber} by user ${userId}`);
    this.eventEmitter.emit('shipment.shipped', { shipment: this.mapToShipment(shipment), userId });

    return this.mapToShipment(shipment);
  }

  async markDelivered(id: string, companyId: string, userId: string, signedBy?: string): Promise<Shipment> {
    const existing = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { companyId: true, id: true } } },
    });

    if (!existing || existing.order.companyId !== companyId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    if (existing.status !== 'IN_TRANSIT' && existing.status !== 'OUT_FOR_DELIVERY') {
      throw new BadRequestException(`Cannot deliver from status ${existing.status}`);
    }

    const shipment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          signedBy,
        },
        include: { events: true },
      });

      // Add tracking event
      await tx.shipmentEvent.create({
        data: {
          shipmentId: id,
          status: 'DELIVERED',
          description: signedBy ? `Delivered, signed by ${signedBy}` : 'Delivered',
          occurredAt: new Date(),
        },
      });

      // Update order fulfillment status
      await this.updateOrderFulfillmentStatus(tx, existing.order.id);

      return updated;
    });

    this.logger.log(`Marked shipment delivered: ${shipment.shipmentNumber} by user ${userId}`);
    this.eventEmitter.emit('shipment.delivered', { shipment: this.mapToShipment(shipment), userId });

    return this.mapToShipment(shipment);
  }

  // ═══════════════════════════════════════════════════════════════
  // TRACKING EVENTS
  // ═══════════════════════════════════════════════════════════════

  async addEvent(id: string, companyId: string, dto: AddTrackingEventDto, userId: string): Promise<ShipmentEvent> {
    const existing = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { companyId: true } } },
    });

    if (!existing || existing.order.companyId !== companyId) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    const event = await this.prisma.shipmentEvent.create({
      data: {
        shipmentId: id,
        status: dto.status as any,
        description: dto.description,
        location: dto.location,
        carrierCode: dto.carrierCode,
        carrierMessage: dto.carrierMessage,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      },
    });

    this.logger.log(`Added tracking event to shipment ${existing.shipmentNumber} by user ${userId}`);

    return this.mapToEvent(event);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async updateOrderFulfillmentStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const shipments = await tx.shipment.findMany({
      where: { orderId },
    });

    if (shipments.length === 0) return;

    const allDelivered = shipments.every((s) => s.status === 'DELIVERED');
    const anyShipped = shipments.some((s) =>
      ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status),
    );

    let fulfillmentStatus: string = 'UNFULFILLED';
    let orderStatus: string | undefined;

    if (allDelivered) {
      fulfillmentStatus = 'FULFILLED';
      orderStatus = 'COMPLETED';
    } else if (anyShipped) {
      fulfillmentStatus = 'PARTIALLY_FULFILLED';
      orderStatus = 'SHIPPED';
    }

    const updateData: Prisma.OrderUpdateInput = {
      fulfillmentStatus: fulfillmentStatus as any,
    };

    if (orderStatus) {
      updateData.status = orderStatus as any;
    }

    if (fulfillmentStatus === 'FULFILLED') {
      updateData.fulfilledAt = new Date();
    }

    await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  private mapToShipment(data: any): Shipment {
    return {
      id: data.id,
      orderId: data.orderId,
      shipmentNumber: data.shipmentNumber,
      carrier: data.carrier,
      carrierService: data.carrierService,
      trackingNumber: data.trackingNumber,
      trackingUrl: data.trackingUrl,
      shippingMethod: data.shippingMethod,
      weight: data.weight ? Number(data.weight) : undefined,
      weightUnit: data.weightUnit,
      length: data.length ? Number(data.length) : undefined,
      width: data.width ? Number(data.width) : undefined,
      height: data.height ? Number(data.height) : undefined,
      dimensionUnit: data.dimensionUnit,
      shippingCost: data.shippingCost ? Number(data.shippingCost) : undefined,
      insuranceAmount: data.insuranceAmount ? Number(data.insuranceAmount) : undefined,
      shippingLabelUrl: data.shippingLabelUrl,
      returnLabelUrl: data.returnLabelUrl,
      shippingAddressSnapshot: data.shippingAddressSnapshot as Record<string, unknown>,
      status: data.status,
      estimatedShipDate: data.estimatedShipDate,
      estimatedDeliveryDate: data.estimatedDeliveryDate,
      shippedAt: data.shippedAt,
      deliveredAt: data.deliveredAt,
      signatureRequired: data.signatureRequired,
      signedBy: data.signedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      events: data.events?.map(this.mapToEvent.bind(this)),
    };
  }

  private mapToEvent(data: any): ShipmentEvent {
    return {
      id: data.id,
      shipmentId: data.shipmentId,
      status: data.status,
      description: data.description,
      location: data.location,
      carrierCode: data.carrierCode,
      carrierMessage: data.carrierMessage,
      carrierData: data.carrierData as Record<string, unknown>,
      occurredAt: data.occurredAt,
      createdAt: data.createdAt,
    };
  }
}
