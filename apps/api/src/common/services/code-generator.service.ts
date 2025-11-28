import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type EntityType = 'client' | 'company';

// Reserved codes that might be confusing
const RESERVED_CODES = new Set([
  '0000', 'AAAA', 'TEST', 'DEMO', 'NULL', 'NONE', 'XXXX', 'ZZZZ',
]);

@Injectable()
export class CodeGeneratorService {
  private readonly logger = new Logger(CodeGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique 4-character alphanumeric code for a client
   * Client codes are globally unique
   * Uses transaction to prevent race conditions
   */
  async generateClientCode(name: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      return this.generateUniqueCode('client', name, undefined, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  /**
   * Generate a unique 4-character alphanumeric code for a company
   * Company codes are unique within a client
   * Uses transaction to prevent race conditions
   */
  async generateCompanyCode(name: string, clientId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      return this.generateUniqueCode('company', name, clientId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  /**
   * Ensure a client has a code, generate if missing
   */
  async ensureClientCode(clientId: string): Promise<string> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new BadRequestException(`Client ${clientId} not found`);
    }

    if (client.code) return client.code;

    const code = await this.generateClientCode(client.name);
    await this.prisma.client.update({
      where: { id: clientId },
      data: { code },
    });

    this.logger.log(`Generated code ${code} for client ${clientId}`);
    return code;
  }

  /**
   * Ensure a company has a code, generate if missing
   */
  async ensureCompanyCode(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException(`Company ${companyId} not found`);
    }

    if (company.code) return company.code;

    const code = await this.generateCompanyCode(company.name, company.clientId);
    await this.prisma.company.update({
      where: { id: companyId },
      data: { code },
    });

    this.logger.log(`Generated code ${code} for company ${companyId}`);
    return code;
  }

  /**
   * Generate a unique code, checking for collisions
   * Uses batched uniqueness check for efficiency
   */
  private async generateUniqueCode(
    type: EntityType,
    name: string,
    clientId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const prisma = tx || this.prisma;

    // Try name-based code first
    const nameCode = this.extractCodeFromName(name);

    // Batch fetch existing codes with this prefix for efficiency
    const existingCodes = await this.getExistingCodesWithPrefix(
      type,
      nameCode.slice(0, 2),
      clientId,
      prisma,
    );

    if (!existingCodes.has(nameCode) && !RESERVED_CODES.has(nameCode)) {
      return nameCode;
    }

    // Try variations with numbers (AA01, AA02, etc.)
    for (let i = 1; i <= 99; i++) {
      const suffix = String(i).padStart(2, '0');
      const variation = nameCode.slice(0, 2) + suffix;
      if (!existingCodes.has(variation) && !RESERVED_CODES.has(variation)) {
        return variation;
      }
    }

    // Fallback to random
    return this.generateRandomCode(type, clientId, prisma);
  }

  /**
   * Batch fetch existing codes with a given prefix
   */
  private async getExistingCodesWithPrefix(
    type: EntityType,
    prefix: string,
    clientId?: string,
    prisma?: Prisma.TransactionClient | PrismaService,
  ): Promise<Set<string>> {
    const db = prisma || this.prisma;

    if (type === 'client') {
      const existing = await db.client.findMany({
        where: { code: { startsWith: prefix } },
        select: { code: true },
      });
      return new Set(existing.map(e => e.code).filter((c): c is string => c !== null));
    } else {
      const existing = await db.company.findMany({
        where: {
          clientId,
          code: { startsWith: prefix },
        },
        select: { code: true },
      });
      return new Set(existing.map(e => e.code).filter((c): c is string => c !== null));
    }
  }

  /**
   * Extract a 4-character code from a name
   * Examples:
   *   "Acme Corporation" -> "ACME"
   *   "J&B Coffee Roasters" -> "JBCO"
   *   "AI" -> "AIXX" (padded with random)
   */
  private extractCodeFromName(name: string): string {
    // Remove non-alphanumeric, take first 4 chars, uppercase
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (clean.length >= 4) {
      return clean.slice(0, 4);
    }

    // Pad with random letters if too short
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = clean;
    while (code.length < 4) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Generate a random 4-character alphanumeric code
   */
  private async generateRandomCode(
    type: EntityType,
    clientId?: string,
    prisma?: Prisma.TransactionClient | PrismaService,
  ): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      if (!RESERVED_CODES.has(code) && await this.isCodeUnique(type, code, clientId, prisma)) {
        return code;
      }
      attempts++;
    }

    throw new BadRequestException(`Failed to generate unique ${type} code after ${maxAttempts} attempts`);
  }

  /**
   * Check if a code is unique for the given entity type
   */
  private async isCodeUnique(
    type: EntityType,
    code: string,
    clientId?: string,
    prisma?: Prisma.TransactionClient | PrismaService,
  ): Promise<boolean> {
    const db = prisma || this.prisma;

    if (type === 'client') {
      // Client codes must be globally unique
      const existing = await db.client.findFirst({ where: { code } });
      return !existing;
    } else {
      // Company codes must be unique per client
      const existing = await db.company.findFirst({
        where: { code, clientId },
      });
      return !existing;
    }
  }

  /**
   * Validate a manually provided code
   */
  validateCode(code: string): { valid: boolean; error?: string } {
    if (!code) {
      return { valid: false, error: 'Code is required' };
    }

    if (code.length !== 4) {
      return { valid: false, error: 'Code must be exactly 4 characters' };
    }

    if (!/^[A-Z0-9]{4}$/.test(code)) {
      return { valid: false, error: 'Code must be uppercase alphanumeric only (A-Z, 0-9)' };
    }

    if (RESERVED_CODES.has(code)) {
      return { valid: false, error: 'This code is reserved and cannot be used' };
    }

    return { valid: true };
  }

  /**
   * Check if a code is available
   */
  async isCodeAvailable(
    type: EntityType,
    code: string,
    clientId?: string,
  ): Promise<boolean> {
    const validation = this.validateCode(code);
    if (!validation.valid) return false;

    return this.isCodeUnique(type, code, clientId);
  }

  /**
   * Generate codes for all entities missing them (for migration/backfill)
   */
  async backfillAllCodes(): Promise<{ clients: number; companies: number }> {
    let clientCount = 0;
    let companyCount = 0;

    // Backfill client codes
    const clientsWithoutCodes = await this.prisma.client.findMany({
      where: { code: null },
    });

    for (const client of clientsWithoutCodes) {
      try {
        await this.ensureClientCode(client.id);
        clientCount++;
      } catch (error) {
        this.logger.error(`Failed to generate code for client ${client.id}: ${error.message}`);
      }
    }

    // Backfill company codes
    const companiesWithoutCodes = await this.prisma.company.findMany({
      where: { code: null },
    });

    for (const company of companiesWithoutCodes) {
      try {
        await this.ensureCompanyCode(company.id);
        companyCount++;
      } catch (error) {
        this.logger.error(`Failed to generate code for company ${company.id}: ${error.message}`);
      }
    }

    this.logger.log(`Backfilled ${clientCount} client codes and ${companyCount} company codes`);
    return { clients: clientCount, companies: companyCount };
  }
}
