import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate unique order number: ORD-YYYYMMDD-XXXX
   */
  async generate(companyId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ORD-${dateStr}`;

    // Get count of orders today for this company
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.prisma.order.count({
      where: {
        companyId,
        orderNumber: { startsWith: prefix },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * Generate shipment number: SHP-YYYYMMDD-XXXX
   */
  async generateShipmentNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SHP-${dateStr}`;

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.prisma.shipment.count({
      where: {
        shipmentNumber: { startsWith: prefix },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }
}
