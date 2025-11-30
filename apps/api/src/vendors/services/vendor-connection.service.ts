import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorClientConnection, ConnectionStatus, Prisma } from '@prisma/client';
import { ConnectionQueryParams } from '../types/vendor.types';
import { CreateConnectionDto, UpdateConnectionDto } from '../dto/vendor.dto';

@Injectable()
export class VendorConnectionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConnectionDto): Promise<VendorClientConnection> {
    // Verify vendor exists
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, deletedAt: null },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${dto.vendorId}" not found`);
    }

    // Verify vendor company exists and belongs to vendor
    const vendorCompany = await this.prisma.vendorCompany.findFirst({
      where: {
        id: dto.vendorCompanyId,
        vendorId: dto.vendorId,
        deletedAt: null,
      },
    });

    if (!vendorCompany) {
      throw new NotFoundException(`Vendor company with ID "${dto.vendorCompanyId}" not found`);
    }

    // Verify company exists
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${dto.companyId}" not found`);
    }

    // Check if connection already exists
    const existing = await this.prisma.vendorClientConnection.findFirst({
      where: {
        vendorCompanyId: dto.vendorCompanyId,
        companyId: dto.companyId,
      },
    });

    if (existing) {
      throw new ConflictException('Connection between this vendor company and company already exists');
    }

    const { vendorId, vendorCompanyId, companyId, terms, customPricing, ...rest } = dto;

    return this.prisma.vendorClientConnection.create({
      data: {
        ...rest,
        terms: (terms ?? {}) as Prisma.JsonObject,
        customPricing: (customPricing ?? {}) as Prisma.JsonObject,
        status: ConnectionStatus.PENDING,
        vendor: { connect: { id: vendorId } },
        vendorCompany: { connect: { id: vendorCompanyId } },
        company: { connect: { id: companyId } },
      },
      include: {
        vendor: {
          select: { id: true, name: true, code: true, tier: true },
        },
        vendorCompany: {
          select: { id: true, name: true, code: true },
        },
        company: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async findAll(
    params: ConnectionQueryParams = {},
  ): Promise<{ items: VendorClientConnection[]; total: number }> {
    const {
      vendorId,
      vendorCompanyId,
      companyId,
      status,
      limit = 20,
      offset = 0,
    } = params;

    const where: Prisma.VendorClientConnectionWhereInput = {
      ...(vendorId && { vendorId }),
      ...(vendorCompanyId && { vendorCompanyId }),
      ...(companyId && { companyId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.vendorClientConnection.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: { id: true, name: true, code: true, tier: true, averageRating: true },
          },
          vendorCompany: {
            select: { id: true, name: true, code: true, capabilities: true },
          },
          company: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              syncedProducts: true,
              orders: true,
            },
          },
        },
      }),
      this.prisma.vendorClientConnection.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<VendorClientConnection> {
    const connection = await this.prisma.vendorClientConnection.findUnique({
      where: { id },
      include: {
        vendor: true,
        vendorCompany: {
          include: {
            products: {
              where: { isActive: true },
              take: 10,
            },
          },
        },
        company: true,
        syncedProducts: {
          include: {
            vendorProduct: true,
            companyProduct: true,
          },
          take: 20,
        },
        _count: {
          select: {
            syncedProducts: true,
            orders: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException(`Connection with ID "${id}" not found`);
    }

    return connection;
  }

  async findByCompany(companyId: string): Promise<VendorClientConnection[]> {
    return this.prisma.vendorClientConnection.findMany({
      where: {
        companyId,
        status: ConnectionStatus.ACTIVE,
      },
      include: {
        vendor: {
          select: { id: true, name: true, code: true, tier: true, averageRating: true },
        },
        vendorCompany: {
          select: { id: true, name: true, code: true, capabilities: true },
          include: {
            _count: {
              select: { products: { where: { isActive: true } } },
            },
          },
        },
        _count: {
          select: {
            syncedProducts: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateConnectionDto): Promise<VendorClientConnection> {
    await this.findById(id);

    const { terms, customPricing, ...rest } = dto;

    return this.prisma.vendorClientConnection.update({
      where: { id },
      data: {
        ...rest,
        ...(terms && { terms: terms as Prisma.JsonObject }),
        ...(customPricing && { customPricing: customPricing as Prisma.JsonObject }),
      },
      include: {
        vendor: {
          select: { id: true, name: true, code: true },
        },
        vendorCompany: {
          select: { id: true, name: true, code: true },
        },
        company: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async approve(id: string, approved: boolean, userId: string): Promise<VendorClientConnection> {
    const connection = await this.findById(id);

    if (connection.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException('Can only approve/reject pending connections');
    }

    return this.prisma.vendorClientConnection.update({
      where: { id },
      data: {
        status: approved ? ConnectionStatus.ACTIVE : ConnectionStatus.TERMINATED,
        approvedAt: approved ? new Date() : null,
        approvedBy: approved ? userId : null,
      },
      include: {
        vendor: {
          select: { id: true, name: true, code: true },
        },
        vendorCompany: {
          select: { id: true, name: true, code: true },
        },
        company: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async updateStatus(id: string, status: ConnectionStatus): Promise<VendorClientConnection> {
    await this.findById(id);

    return this.prisma.vendorClientConnection.update({
      where: { id },
      data: { status },
      include: {
        vendor: {
          select: { id: true, name: true, code: true },
        },
        vendorCompany: {
          select: { id: true, name: true, code: true },
        },
        company: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);

    await this.prisma.$transaction([
      // Delete synced products first
      this.prisma.vendorProductSync.deleteMany({
        where: { connectionId: id },
      }),
      // Delete the connection
      this.prisma.vendorClientConnection.delete({
        where: { id },
      }),
    ]);
  }
}
