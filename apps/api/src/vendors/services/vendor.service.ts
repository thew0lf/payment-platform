import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Vendor, Prisma, VendorStatus, VendorTier } from '@prisma/client';
import { VendorQueryParams, VendorStats } from '../types/vendor.types';
import { CreateVendorDto, UpdateVendorDto } from '../dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  private generateCode(name: string, existingCodes: Set<string>): string {
    const RESERVED_CODES = new Set([
      '0000', 'AAAA', 'TEST', 'DEMO', 'NULL', 'NONE', 'XXXX', 'ZZZZ',
    ]);

    const extractCodeFromName = (n: string): string => {
      const clean = n.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (clean.length >= 4) return clean.slice(0, 4);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let code = clean;
      while (code.length < 4) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    let code = extractCodeFromName(name);
    let attempt = 0;

    while (existingCodes.has(code) || RESERVED_CODES.has(code)) {
      attempt++;
      if (attempt <= 99) {
        const suffix = String(attempt).padStart(2, '0');
        code = extractCodeFromName(name).slice(0, 2) + suffix;
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code = '';
        for (let i = 0; i < 4; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
      }
    }

    return code;
  }

  async create(organizationId: string, dto: CreateVendorDto): Promise<Vendor> {
    // Check for slug uniqueness within organization
    const existing = await this.prisma.vendor.findFirst({
      where: {
        organizationId,
        slug: dto.slug,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Vendor with slug "${dto.slug}" already exists`);
    }

    // Get all existing codes to ensure uniqueness
    const [vendorCodes, clientCodes, companyCodes, vendorCompanyCodes] = await Promise.all([
      this.prisma.vendor.findMany({ select: { code: true }, where: { code: { not: null } } }),
      this.prisma.client.findMany({ select: { code: true }, where: { code: { not: null } } }),
      this.prisma.company.findMany({ select: { code: true }, where: { code: { not: null } } }),
      this.prisma.vendorCompany.findMany({ select: { code: true }, where: { code: { not: null } } }),
    ]);

    const existingCodes = new Set([
      ...vendorCodes.map(v => v.code!),
      ...clientCodes.map(c => c.code!),
      ...companyCodes.map(c => c.code!),
      ...vendorCompanyCodes.map(vc => vc.code!),
    ]);

    const code = this.generateCode(dto.name, existingCodes);

    return this.prisma.vendor.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        code,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        businessName: dto.businessName,
        taxId: dto.taxId,
        website: dto.website,
        description: dto.description,
        vendorType: dto.vendorType,
        settings: (dto.settings ?? {}) as Prisma.JsonObject,
        status: VendorStatus.PENDING_VERIFICATION,
        organization: { connect: { id: organizationId } },
      },
      include: {
        vendorCompanies: true,
        _count: {
          select: {
            vendorCompanies: true,
            clientConnections: true,
          },
        },
      },
    });
  }

  async findAll(
    organizationId: string,
    params: VendorQueryParams = {},
  ): Promise<{ items: Vendor[]; total: number }> {
    const {
      search,
      status,
      tier,
      vendorType,
      isVerified,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.VendorWhereInput = {
      organizationId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
          { businessName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(tier && { tier }),
      ...(vendorType && { vendorType }),
      ...(typeof isVerified === 'boolean' && { isVerified }),
    };

    const [items, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendorCompanies: {
            where: { deletedAt: null },
            take: 5,
          },
          _count: {
            select: {
              vendorCompanies: { where: { deletedAt: null } },
              clientConnections: { where: { status: 'ACTIVE' } },
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string, organizationId: string): Promise<Vendor> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        vendorCompanies: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: {
                products: { where: { isActive: true } },
                clientConnections: { where: { status: 'ACTIVE' } },
              },
            },
          },
        },
        clientConnections: {
          where: { status: 'ACTIVE' },
          include: {
            company: true,
            vendorCompany: true,
          },
          take: 10,
        },
        _count: {
          select: {
            vendorCompanies: { where: { deletedAt: null } },
            clientConnections: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${id}" not found`);
    }

    return vendor;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateVendorDto,
  ): Promise<Vendor> {
    const vendor = await this.findById(id, organizationId);

    const { settings, ...rest } = dto;

    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...rest,
        ...(settings && { settings: settings as Prisma.JsonObject }),
      },
      include: {
        vendorCompanies: {
          where: { deletedAt: null },
        },
        _count: {
          select: {
            vendorCompanies: { where: { deletedAt: null } },
            clientConnections: true,
          },
        },
      },
    });
  }

  async verify(
    id: string,
    organizationId: string,
    isVerified: boolean,
  ): Promise<Vendor> {
    const vendor = await this.findById(id, organizationId);

    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        status: isVerified ? VendorStatus.VERIFIED : VendorStatus.PENDING_VERIFICATION,
      },
    });
  }

  async softDelete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const vendor = await this.findById(id, organizationId);
    const cascadeId = `vendor_${id}_${Date.now()}`;

    await this.prisma.$transaction([
      // Soft delete vendor
      this.prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
          cascadeId,
        },
      }),
      // Soft delete all vendor companies
      this.prisma.vendorCompany.updateMany({
        where: { vendorId: vendor.id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
          cascadeId,
        },
      }),
    ]);
  }

  async getStats(organizationId: string): Promise<VendorStats> {
    const vendors = await this.prisma.vendor.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: {
        status: true,
        tier: true,
        vendorType: true,
      },
    });

    const stats: VendorStats = {
      totalVendors: vendors.length,
      activeVendors: vendors.filter(v => v.status === 'ACTIVE').length,
      pendingVerification: vendors.filter(v => v.status === 'PENDING_VERIFICATION').length,
      byTier: {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
      },
      byType: {
        SUPPLIER: 0,
        DROPSHIPPER: 0,
        WHITE_LABEL: 0,
        AFFILIATE: 0,
      },
    };

    for (const vendor of vendors) {
      stats.byTier[vendor.tier]++;
      stats.byType[vendor.vendorType]++;
    }

    return stats;
  }

  async updateMetrics(vendorId: string): Promise<void> {
    // Calculate metrics from vendor orders
    const metrics = await this.prisma.vendorOrder.aggregate({
      where: {
        connection: { vendorId },
      },
      _count: { _all: true },
      _avg: { total: true },
    });

    const completedOrders = await this.prisma.vendorOrder.count({
      where: {
        connection: { vendorId },
        status: 'COMPLETED',
      },
    });

    // Get average rating from reviews
    const reviewMetrics = await this.prisma.marketplaceReview.aggregate({
      where: { vendorId, isApproved: true },
      _avg: { rating: true },
    });

    const completionRate = metrics._count._all > 0
      ? (completedOrders / metrics._count._all) * 100
      : 100;

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        totalOrders: metrics._count._all,
        completionRate,
        averageRating: reviewMetrics._avg.rating || 0,
      },
    });
  }
}
