import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorCompany, Prisma } from '@prisma/client';
import { VendorCompanyQueryParams } from '../types/vendor.types';
import { CreateVendorCompanyDto, UpdateVendorCompanyDto } from '../dto/vendor.dto';

@Injectable()
export class VendorCompanyService {
  constructor(private prisma: PrismaService) {}

  private async generateCode(name: string): Promise<string> {
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

    // Get all existing codes
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

  async create(dto: CreateVendorCompanyDto): Promise<VendorCompany> {
    // Verify vendor exists
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, deletedAt: null },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${dto.vendorId}" not found`);
    }

    // Check for slug uniqueness within vendor
    const existing = await this.prisma.vendorCompany.findFirst({
      where: {
        vendorId: dto.vendorId,
        slug: dto.slug,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Vendor company with slug "${dto.slug}" already exists for this vendor`);
    }

    const code = await this.generateCode(dto.name);

    const { vendorId, settings, ...rest } = dto;

    return this.prisma.vendorCompany.create({
      data: {
        ...rest,
        code,
        settings: (settings ?? {}) as Prisma.JsonObject,
        vendor: { connect: { id: vendorId } },
      },
      include: {
        vendor: true,
        _count: {
          select: {
            products: { where: { isActive: true } },
            clientConnections: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });
  }

  async findAll(
    params: VendorCompanyQueryParams = {},
  ): Promise<{ items: VendorCompany[]; total: number }> {
    const {
      vendorId,
      search,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.VendorCompanyWhereInput = {
      deletedAt: null,
      ...(vendorId && { vendorId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.vendorCompany.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              code: true,
              tier: true,
              averageRating: true,
            },
          },
          _count: {
            select: {
              products: { where: { isActive: true } },
              clientConnections: { where: { status: 'ACTIVE' } },
            },
          },
        },
      }),
      this.prisma.vendorCompany.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<VendorCompany> {
    const vendorCompany = await this.prisma.vendorCompany.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        vendor: true,
        products: {
          where: { isActive: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        clientConnections: {
          where: { status: 'ACTIVE' },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          take: 10,
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
            clientConnections: { where: { status: 'ACTIVE' } },
            orders: true,
          },
        },
      },
    });

    if (!vendorCompany) {
      throw new NotFoundException(`Vendor company with ID "${id}" not found`);
    }

    return vendorCompany;
  }

  async findByVendor(vendorId: string): Promise<VendorCompany[]> {
    return this.prisma.vendorCompany.findMany({
      where: {
        vendorId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
            clientConnections: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateVendorCompanyDto): Promise<VendorCompany> {
    await this.findById(id);

    const { settings, ...rest } = dto;

    return this.prisma.vendorCompany.update({
      where: { id },
      data: {
        ...rest,
        ...(settings && { settings: settings as Prisma.JsonObject }),
      },
      include: {
        vendor: true,
        _count: {
          select: {
            products: { where: { isActive: true } },
            clientConnections: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.findById(id);
    const cascadeId = `vendor_company_${id}_${Date.now()}`;

    await this.prisma.vendorCompany.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        cascadeId,
      },
    });
  }
}
