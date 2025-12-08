import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CustomerOrderLookupDto {
  orderNumber: string;
  email: string;
}

interface CustomerOrdersQueryDto {
  email: string;
}

interface PublicOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string;
}

interface PublicOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  items: PublicOrderItem[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public orders controller - no authentication required.
 * Allows customers to look up their orders with order number + email verification.
 */
@Controller('orders/public')
export class PublicOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Look up a single order by order number and email
   * Requires both to match for security
   */
  @Post('lookup')
  async lookupOrder(@Body() dto: CustomerOrderLookupDto): Promise<PublicOrder> {
    if (!dto.orderNumber || !dto.email) {
      throw new BadRequestException('Order number and email are required');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber: dto.orderNumber.toUpperCase(),
        customer: {
          email: { equals: dto.email, mode: 'insensitive' },
        },
        deletedAt: null,
      },
      include: {
        items: true,
        shipments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found. Please check your order number and email.');
    }

    return this.toPublicOrder(order);
  }

  /**
   * Get all orders for a customer by email
   * Uses POST to avoid email in URL/logs
   */
  @Post('my-orders')
  async getCustomerOrders(@Body() dto: CustomerOrdersQueryDto): Promise<{ orders: PublicOrder[]; total: number }> {
    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        customer: {
          email: { equals: dto.email, mode: 'insensitive' },
        },
        deletedAt: null,
      },
      include: {
        items: true,
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 orders
    });

    const total = await this.prisma.order.count({
      where: {
        customer: {
          email: { equals: dto.email, mode: 'insensitive' },
        },
        deletedAt: null,
      },
    });

    return {
      orders: orders.map((o) => this.toPublicOrder(o)),
      total,
    };
  }

  /**
   * Transform order to public-safe format
   * Strips sensitive data like internal IDs, costs, etc.
   */
  private toPublicOrder(order: any): PublicOrder {
    // Shipping snapshot is stored as JSON
    const shippingSnapshot = order.shippingSnapshot as any;
    // Get the first shipment if available (most recent)
    const shipment = order.shipments?.[0];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.unitPrice) * item.quantity,
        imageUrl: item.imageUrl || undefined,
      })),
      subtotal: Number(order.subtotal),
      shippingAmount: Number(order.shippingAmount),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      currency: order.currency,
      shippingAddress: shippingSnapshot ? {
        firstName: shippingSnapshot.firstName || '',
        lastName: shippingSnapshot.lastName || '',
        city: shippingSnapshot.city || '',
        state: shippingSnapshot.state || '',
        postalCode: shippingSnapshot.postalCode || '',
        country: shippingSnapshot.country || '',
      } : undefined,
      trackingNumber: shipment?.trackingNumber || undefined,
      trackingUrl: shipment?.trackingUrl || undefined,
      estimatedDelivery: shipment?.estimatedDelivery?.toISOString() || undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
