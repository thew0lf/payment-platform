import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';

@Injectable()
export class OrderNumberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerator: CodeGeneratorService,
  ) {}

  /**
   * Generate unique order number using client/company codes
   * Format: CLNT-COMP-0001234 (e.g., VELO-COFF-0001234)
   * Falls back to: ORD-YYYYMMDD-XXXX if codes not available
   */
  async generate(companyId: string): Promise<string> {
    // Get company with client to retrieve codes
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { client: true },
    });

    const clientCode = company?.client?.code;
    const companyCode = company?.code;

    // Use new format if both codes are available
    if (clientCode && companyCode) {
      // Get total order count for this company (ever, not just today)
      const count = await this.prisma.order.count({
        where: { companyId },
      });

      const sequence = String(count + 1).padStart(7, '0');
      return `${clientCode}-${companyCode}-${sequence}`;
    }

    // Fallback to legacy format
    return this.generateLegacy(companyId);
  }

  /**
   * Legacy order number format: ORD-YYYYMMDD-XXXX
   */
  private async generateLegacy(companyId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ORD-${dateStr}`;

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
   * Generate shipment number using client/company codes
   * Format: CLNT-COMP-SHP-00123 (e.g., VELO-COFF-SHP-00123)
   * Falls back to: SHP-YYYYMMDD-XXXX if codes not available
   */
  async generateShipmentNumber(companyId?: string): Promise<string> {
    if (companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: { client: true },
      });

      const clientCode = company?.client?.code;
      const companyCode = company?.code;

      if (clientCode && companyCode) {
        const count = await this.prisma.shipment.count({
          where: {
            order: { companyId },
          },
        });

        const sequence = String(count + 1).padStart(5, '0');
        return `${clientCode}-${companyCode}-SHP-${sequence}`;
      }
    }

    // Fallback to legacy format
    return this.generateLegacyShipmentNumber();
  }

  /**
   * Legacy shipment number format: SHP-YYYYMMDD-XXXX
   */
  private async generateLegacyShipmentNumber(): Promise<string> {
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
