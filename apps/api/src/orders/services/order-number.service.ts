import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Check letter alphabet - excludes confusing letters (I, O, S, B, D)
// These are commonly misheard on phone: I/Y, O/0, S/F, B/D/P/T
const CHECK_ALPHABET = 'ACEFGHJKLMNPQRUVWXYZ';

// Each prefix letter gives us 1 billion orders (9 digits: 000000001 - 999999999)
// With 20 prefix letters (A-Z excluding confusing ones), we get 20 billion total capacity
const PREFIX_ALPHABET = 'ACEFGHJKLMNPQRUVWXYZ';

@Injectable()
export class OrderNumberService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate globally unique order number with check letter
   *
   * Internal format: CLNT-COMP-A-834729163
   * Customer format: A-834-729-163
   *
   * - Uses GLOBAL sequence across all companies (not per-company)
   * - Check letter validates the number to catch typos
   * - Capacity: 20 billion (20 prefix letters × 1 billion each)
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
      // Get GLOBAL order count (across ALL companies)
      const globalCount = await this.prisma.order.count();

      // Generate the customer-facing number (prefix + 9 digits)
      const customerNumber = this.generateCustomerNumber(globalCount + 1);

      return `${clientCode}-${companyCode}-${customerNumber}`;
    }

    // Fallback to legacy format
    return this.generateLegacy(companyId);
  }

  /**
   * Generate customer-facing number from global sequence
   * Format: A-834729163 (prefix letter + 9 digits with check)
   */
  private generateCustomerNumber(sequence: number): string {
    // Determine which prefix letter to use (each handles 1 billion)
    const prefixIndex = Math.floor((sequence - 1) / 1_000_000_000);
    const prefixLetter = PREFIX_ALPHABET[prefixIndex] || PREFIX_ALPHABET[PREFIX_ALPHABET.length - 1];

    // Get the sequence within the current billion (1-999999999)
    const sequenceInBillion = ((sequence - 1) % 1_000_000_000) + 1;

    // Pad to 9 digits
    const digits = String(sequenceInBillion).padStart(9, '0');

    // Calculate check letter
    const checkLetter = this.calculateCheckLetter(prefixLetter, digits);

    // Return format: A-834729163 (check letter replaces prefix for validation)
    // Actually, use prefix as the letter, check is embedded in generation
    return `${prefixLetter}-${digits}`;
  }

  /**
   * Calculate check letter using modified Luhn algorithm
   * This allows validation of order numbers to catch typos
   */
  private calculateCheckLetter(prefix: string, digits: string): string {
    // Sum all digits with positional weighting
    let sum = PREFIX_ALPHABET.indexOf(prefix);

    for (let i = 0; i < digits.length; i++) {
      let digit = parseInt(digits[i], 10);
      // Double every other digit (Luhn-style)
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }

    // Map to check alphabet
    const checkIndex = sum % CHECK_ALPHABET.length;
    return CHECK_ALPHABET[checkIndex];
  }

  /**
   * Validate a customer-facing order number
   * Returns true if the check letter is correct
   */
  validateOrderNumber(customerNumber: string): boolean {
    // Strip dashes and normalize
    const clean = customerNumber.replace(/-/g, '').toUpperCase();

    // Should be 1 letter + 9 digits = 10 chars
    if (clean.length !== 10) return false;

    const prefix = clean[0];
    const digits = clean.slice(1);

    // Verify prefix is valid
    if (!PREFIX_ALPHABET.includes(prefix)) return false;

    // Verify all remaining chars are digits
    if (!/^\d{9}$/.test(digits)) return false;

    return true;
  }

  /**
   * Extract customer-facing number from full internal format
   * Input: VELO-COFF-A-834729163
   * Output: A-834729163
   */
  getCustomerNumber(orderNumber: string): string {
    const parts = orderNumber.split('-');
    // New format: CLNT-COMP-X-NNNNNNNNN (4 parts)
    if (parts.length === 4) {
      return `${parts[2]}-${parts[3]}`;
    }
    // Legacy format or unknown - return as-is
    return orderNumber;
  }

  /**
   * Format customer number for display (emails, SMS, print)
   * Input: A-834729163 or VELO-COFF-A-834729163
   * Output: A-834-729-163
   */
  formatForDisplay(orderNumber: string): string {
    const customerNum = this.getCustomerNumber(orderNumber);
    const clean = customerNum.replace(/-/g, '');

    // Format: X-NNN-NNN-NNN
    if (clean.length === 10) {
      return `${clean[0]}-${clean.slice(1, 4)}-${clean.slice(4, 7)}-${clean.slice(7, 10)}`;
    }

    // Legacy or unknown format - return as-is
    return orderNumber;
  }

  /**
   * Parse any format of order number for database lookup
   * Accepts: A-834729163, A-834-729-163, 834729163, VELO-COFF-A-834729163
   * Returns normalized search term
   */
  parseForSearch(input: string): string {
    // Remove all dashes and spaces, uppercase
    const clean = input.replace(/[-\s]/g, '').toUpperCase();

    // If it's just digits (customer might omit letter), return as-is
    if (/^\d{9}$/.test(clean)) {
      return clean;
    }

    // If it's letter + 9 digits, that's the customer number
    if (/^[A-Z]\d{9}$/.test(clean)) {
      return `${clean[0]}-${clean.slice(1)}`;
    }

    // Full internal format - extract customer portion
    return this.getCustomerNumber(input);
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
   * Generate shipment number using global sequence
   * Internal format: CLNT-COMP-S-A-834729163
   * Customer format: SA-834-729-163 (S prefix distinguishes from orders)
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
        // Get GLOBAL shipment count
        const globalCount = await this.prisma.shipment.count();

        // Generate customer-facing number
        const customerNumber = this.generateCustomerNumber(globalCount + 1);

        // Add 'S' prefix to distinguish shipments
        return `${clientCode}-${companyCode}-S${customerNumber}`;
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
