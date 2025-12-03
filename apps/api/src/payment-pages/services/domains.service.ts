import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DomainConfig {
  id: string;
  domain: string;
  isVerified: boolean;
  verificationToken: string | null;
  verifiedAt: Date | null;
  sslStatus: string;
  sslExpiresAt: Date | null;
  cnameTarget: string | null;
  defaultPageId: string | null;
  defaultPage?: {
    id: string;
    name: string;
    slug: string;
  };
  dnsInstructions: DnsInstructions;
  createdAt: Date;
}

export interface DnsInstructions {
  cname: {
    host: string;
    type: 'CNAME';
    value: string;
    ttl: number;
  };
  verification: {
    host: string;
    type: 'TXT';
    value: string;
    ttl: number;
  };
}

export interface CreateDomainDto {
  domain: string;
  defaultPageId?: string;
}

export interface UpdateDomainDto {
  defaultPageId?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// DOMAINS SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class DomainsService {
  private readonly CNAME_TARGET = 'checkout.avnz.io'; // Our checkout hosting domain
  private readonly VERIFICATION_PREFIX = '_avnz-verify';

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────

  async findAll(companyId: string): Promise<DomainConfig[]> {
    const domains = await this.prisma.paymentPageDomain.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    // Get default pages for all domains
    const pageIds = domains
      .filter((d) => d.defaultPageId)
      .map((d) => d.defaultPageId as string);

    const pages = pageIds.length
      ? await this.prisma.paymentPage.findMany({
          where: { id: { in: pageIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];

    const pageMap = new Map(pages.map((p) => [p.id, p]));

    return domains.map((domain) => this.formatDomainConfig(domain, pageMap));
  }

  async findById(id: string, companyId: string): Promise<DomainConfig> {
    const domain = await this.prisma.paymentPageDomain.findFirst({
      where: { id, companyId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    let defaultPage: { id: string; name: string; slug: string } | undefined;
    if (domain.defaultPageId) {
      const page = await this.prisma.paymentPage.findUnique({
        where: { id: domain.defaultPageId },
        select: { id: true, name: true, slug: true },
      });
      if (page) {
        defaultPage = page;
      }
    }

    return this.formatDomainConfig(domain, defaultPage ? new Map([[defaultPage.id, defaultPage]]) : new Map());
  }

  async create(companyId: string, dto: CreateDomainDto, userId: string): Promise<DomainConfig> {
    // Validate domain format
    const normalizedDomain = this.normalizeDomain(dto.domain);
    this.validateDomain(normalizedDomain);

    // Check if domain already exists
    const existing = await this.prisma.paymentPageDomain.findUnique({
      where: { domain: normalizedDomain },
    });

    if (existing) {
      throw new ConflictException('This domain is already registered');
    }

    // Verify default page belongs to company if provided
    if (dto.defaultPageId) {
      const page = await this.prisma.paymentPage.findFirst({
        where: { id: dto.defaultPageId, companyId },
      });
      if (!page) {
        throw new BadRequestException('Default page not found or does not belong to this company');
      }
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();

    // Create domain record
    const domain = await this.prisma.paymentPageDomain.create({
      data: {
        companyId,
        domain: normalizedDomain,
        verificationToken,
        cnameTarget: this.CNAME_TARGET,
        defaultPageId: dto.defaultPageId,
        sslStatus: 'PENDING',
        createdBy: userId,
      },
    });

    return this.formatDomainConfig(domain, new Map());
  }

  async update(id: string, companyId: string, dto: UpdateDomainDto, userId: string): Promise<DomainConfig> {
    const domain = await this.prisma.paymentPageDomain.findFirst({
      where: { id, companyId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Verify default page if changing
    if (dto.defaultPageId !== undefined && dto.defaultPageId !== null) {
      const page = await this.prisma.paymentPage.findFirst({
        where: { id: dto.defaultPageId, companyId },
      });
      if (!page) {
        throw new BadRequestException('Default page not found or does not belong to this company');
      }
    }

    const updated = await this.prisma.paymentPageDomain.update({
      where: { id },
      data: {
        defaultPageId: dto.defaultPageId,
        updatedAt: new Date(),
      },
    });

    let defaultPage: { id: string; name: string; slug: string } | undefined;
    if (updated.defaultPageId) {
      const page = await this.prisma.paymentPage.findUnique({
        where: { id: updated.defaultPageId },
        select: { id: true, name: true, slug: true },
      });
      if (page) defaultPage = page;
    }

    return this.formatDomainConfig(updated, defaultPage ? new Map([[defaultPage.id, defaultPage]]) : new Map());
  }

  async delete(id: string, companyId: string): Promise<void> {
    const domain = await this.prisma.paymentPageDomain.findFirst({
      where: { id, companyId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    await this.prisma.paymentPageDomain.delete({
      where: { id },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Domain Verification
  // ─────────────────────────────────────────────────────────────

  async verifyDomain(id: string, companyId: string): Promise<{
    success: boolean;
    cnameVerified: boolean;
    txtVerified: boolean;
    errors: string[];
    domain: DomainConfig;
  }> {
    const domain = await this.prisma.paymentPageDomain.findFirst({
      where: { id, companyId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const errors: string[] = [];
    let cnameVerified = false;
    let txtVerified = false;

    // Check CNAME record
    try {
      const cnameRecords = await resolveCname(domain.domain);
      cnameVerified = cnameRecords.some((record) =>
        record.toLowerCase().includes(this.CNAME_TARGET.toLowerCase()),
      );
      if (!cnameVerified) {
        errors.push(`CNAME record found but points to wrong target: ${cnameRecords.join(', ')}`);
      }
    } catch (err: any) {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
        errors.push('No CNAME record found for this domain');
      } else {
        errors.push(`DNS lookup error for CNAME: ${err.message}`);
      }
    }

    // Check TXT verification record
    try {
      const verificationHost = `${this.VERIFICATION_PREFIX}.${domain.domain}`;
      const txtRecords = await resolveTxt(verificationHost);
      const flatTxt = txtRecords.flat();
      txtVerified = flatTxt.some(
        (record) => record === domain.verificationToken,
      );
      if (!txtVerified && flatTxt.length > 0) {
        errors.push('TXT record found but value does not match verification token');
      }
    } catch (err: any) {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
        errors.push('No TXT verification record found');
      } else {
        errors.push(`DNS lookup error for TXT: ${err.message}`);
      }
    }

    const success = cnameVerified && txtVerified;

    // Update domain status if verified
    if (success && !domain.isVerified) {
      await this.prisma.paymentPageDomain.update({
        where: { id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          sslStatus: 'PROVISIONING', // Trigger SSL certificate provisioning
        },
      });
    }

    // Fetch updated domain
    const updatedDomain = await this.findById(id, companyId);

    return {
      success,
      cnameVerified,
      txtVerified,
      errors,
      domain: updatedDomain,
    };
  }

  async regenerateVerificationToken(id: string, companyId: string): Promise<DomainConfig> {
    const domain = await this.prisma.paymentPageDomain.findFirst({
      where: { id, companyId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain.isVerified) {
      throw new BadRequestException('Cannot regenerate token for a verified domain');
    }

    const newToken = this.generateVerificationToken();

    const updated = await this.prisma.paymentPageDomain.update({
      where: { id },
      data: { verificationToken: newToken },
    });

    return this.formatDomainConfig(updated, new Map());
  }

  // ─────────────────────────────────────────────────────────────
  // SSL Management
  // ─────────────────────────────────────────────────────────────

  async checkSslStatus(id: string, companyId: string): Promise<{
    status: string;
    expiresAt: Date | null;
    domain: string;
    isActive: boolean;
  }> {
    const domain = await this.prisma.paymentPageDomain.findFirst({
      where: { id, companyId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // In production, this would check AWS ACM certificate status
    // For now, we simulate based on verification status
    let status = domain.sslStatus;
    let expiresAt = domain.sslExpiresAt;

    if (domain.isVerified && status === 'PROVISIONING') {
      // Simulate SSL provisioning (in production, check ACM)
      const hoursSinceVerified = domain.verifiedAt
        ? (Date.now() - domain.verifiedAt.getTime()) / (1000 * 60 * 60)
        : 0;

      if (hoursSinceVerified > 0.5) {
        // After 30 minutes, consider SSL active
        status = 'ACTIVE';
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

        await this.prisma.paymentPageDomain.update({
          where: { id },
          data: { sslStatus: status, sslExpiresAt: expiresAt },
        });
      }
    }

    return {
      status,
      expiresAt,
      domain: domain.domain,
      isActive: status === 'ACTIVE',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();
  }

  private validateDomain(domain: string): void {
    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Prevent reserved domains
    const reserved = ['avnz.io', 'localhost', 'example.com', 'test.com'];
    if (reserved.some((r) => domain === r || domain.endsWith(`.${r}`))) {
      throw new BadRequestException('This domain cannot be used');
    }
  }

  private generateVerificationToken(): string {
    return `avnz-verify-${randomBytes(16).toString('hex')}`;
  }

  private formatDomainConfig(
    domain: any,
    pageMap: Map<string, { id: string; name: string; slug: string }>,
  ): DomainConfig {
    const defaultPage = domain.defaultPageId ? pageMap.get(domain.defaultPageId) : undefined;

    return {
      id: domain.id,
      domain: domain.domain,
      isVerified: domain.isVerified,
      verificationToken: domain.verificationToken,
      verifiedAt: domain.verifiedAt,
      sslStatus: domain.sslStatus,
      sslExpiresAt: domain.sslExpiresAt,
      cnameTarget: domain.cnameTarget,
      defaultPageId: domain.defaultPageId,
      defaultPage,
      dnsInstructions: this.getDnsInstructions(domain),
      createdAt: domain.createdAt,
    };
  }

  private getDnsInstructions(domain: any): DnsInstructions {
    return {
      cname: {
        host: domain.domain,
        type: 'CNAME',
        value: domain.cnameTarget || this.CNAME_TARGET,
        ttl: 3600,
      },
      verification: {
        host: `${this.VERIFICATION_PREFIX}.${domain.domain}`,
        type: 'TXT',
        value: domain.verificationToken || '',
        ttl: 3600,
      },
    };
  }
}
