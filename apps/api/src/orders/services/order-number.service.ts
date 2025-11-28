import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Sqids from 'sqids';

// Uppercase alphanumeric alphabet for order numbers (excludes confusing chars: 0, O, I, L)
const ORDER_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';

// Minimum length for encoded sequence (7 chars = 78B+ combinations)
const MIN_SEQUENCE_LENGTH = 7;

@Injectable()
export class OrderNumberService {
  private readonly sqids: Sqids;

  constructor(private readonly prisma: PrismaService) {
    // Initialize Sqids with custom alphabet for order numbers
    // Each company could have its own shuffled alphabet for extra uniqueness,
    // but for simplicity we use a global one
    this.sqids = new Sqids({
      alphabet: ORDER_ALPHABET,
      minLength: MIN_SEQUENCE_LENGTH,
    });
  }

  /**
   * Generate unique order number using client/company codes + encoded sequence
   * Format: CLNT-COMP-XXXXXXX (e.g., VELO-COFF-K7M2X9A)
   *
   * Capacity: 32^7 = 34.3 billion per company (using 32-char alphabet)
   * Security: Sequence is encoded, can't easily guess next order number
   *
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

      // Encode the sequence number (1-based)
      const encodedSequence = this.sqids.encode([count + 1]);

      return `${clientCode}-${companyCode}-${encodedSequence}`;
    }

    // Fallback to legacy format
    return this.generateLegacy(companyId);
  }

  /**
   * Decode an order number's sequence back to the original number
   * Useful for internal operations/debugging
   */
  decodeSequence(orderNumber: string): number | null {
    const parts = orderNumber.split('-');
    if (parts.length !== 3) return null;

    const encodedSequence = parts[2];
    const decoded = this.sqids.decode(encodedSequence);

    return decoded.length > 0 ? decoded[0] : null;
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
   * Generate shipment number using client/company codes + encoded sequence
   * Format: CLNT-COMP-S-XXXXXX (e.g., VELO-COFF-S-K7M2X9)
   *
   * The 'S' prefix distinguishes shipments from orders
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

        // Encode the sequence number (1-based)
        const encodedSequence = this.sqids.encode([count + 1]);

        // Use 'S' prefix to distinguish from orders
        return `${clientCode}-${companyCode}-S-${encodedSequence}`;
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
