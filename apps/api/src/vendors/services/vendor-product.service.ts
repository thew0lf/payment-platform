import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorProduct, Prisma } from '@prisma/client';
import { VendorProductQueryParams } from '../types/vendor.types';
import { CreateVendorProductDto, UpdateVendorProductDto } from '../dto/vendor.dto';

@Injectable()
export class VendorProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVendorProductDto): Promise<VendorProduct> {
    // Verify vendor company exists
    const vendorCompany = await this.prisma.vendorCompany.findFirst({
      where: { id: dto.vendorCompanyId, deletedAt: null },
    });

    if (!vendorCompany) {
      throw new NotFoundException(`Vendor company with ID "${dto.vendorCompanyId}" not found`);
    }

    // Check for SKU uniqueness within vendor company
    const existing = await this.prisma.vendorProduct.findFirst({
      where: {
        vendorCompanyId: dto.vendorCompanyId,
        sku: dto.sku,
      },
    });

    if (existing) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists for this vendor company`);
    }

    const { vendorCompanyId, images, categories, ...rest } = dto;

    return this.prisma.vendorProduct.create({
      data: {
        ...rest,
        stockQuantity: dto.stockQuantity ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
        images: images ?? [],
        categories: categories ?? [],
        vendorCompany: { connect: { id: vendorCompanyId } },
      },
      include: {
        vendorCompany: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async findAll(
    params: VendorProductQueryParams,
  ): Promise<{ items: VendorProduct[]; total: number }> {
    const {
      vendorCompanyId,
      search,
      isActive,
      categories,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.VendorProductWhereInput = {
      vendorCompanyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(categories?.length && {
        categories: { hasSome: categories },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.vendorProduct.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: sortOrder },
        include: {
          vendorCompany: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              syncedProducts: true,
              orderItems: true,
            },
          },
        },
      }),
      this.prisma.vendorProduct.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<VendorProduct> {
    const product = await this.prisma.vendorProduct.findUnique({
      where: { id },
      include: {
        vendorCompany: {
          include: {
            vendor: {
              select: { id: true, name: true, code: true, tier: true },
            },
          },
        },
        syncedProducts: {
          include: {
            connection: {
              include: {
                company: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            syncedProducts: true,
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Vendor product with ID "${id}" not found`);
    }

    return product;
  }

  async findBySku(vendorCompanyId: string, sku: string): Promise<VendorProduct | null> {
    return this.prisma.vendorProduct.findFirst({
      where: {
        vendorCompanyId,
        sku,
      },
    });
  }

  async update(id: string, dto: UpdateVendorProductDto): Promise<VendorProduct> {
    await this.findById(id);

    const { images, categories, ...rest } = dto;

    return this.prisma.vendorProduct.update({
      where: { id },
      data: {
        ...rest,
        ...(images && { images }),
        ...(categories && { categories }),
      },
      include: {
        vendorCompany: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async updateStock(id: string, quantity: number): Promise<VendorProduct> {
    await this.findById(id);

    return this.prisma.vendorProduct.update({
      where: { id },
      data: { stockQuantity: quantity },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);

    // Check if product has synced connections
    const syncCount = await this.prisma.vendorProductSync.count({
      where: { vendorProductId: id },
    });

    if (syncCount > 0) {
      // Deactivate instead of delete if synced
      await this.prisma.vendorProduct.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      await this.prisma.vendorProduct.delete({
        where: { id },
      });
    }
  }

  async bulkUpdateStock(
    updates: { id: string; quantity: number }[],
  ): Promise<{ updated: number; failed: string[] }> {
    const results = { updated: 0, failed: [] as string[] };

    for (const update of updates) {
      try {
        await this.prisma.vendorProduct.update({
          where: { id: update.id },
          data: { stockQuantity: update.quantity },
        });
        results.updated++;
      } catch {
        results.failed.push(update.id);
      }
    }

    return results;
  }

  async getLowStockProducts(vendorCompanyId: string): Promise<VendorProduct[]> {
    return this.prisma.vendorProduct.findMany({
      where: {
        vendorCompanyId,
        isActive: true,
        stockQuantity: {
          lte: this.prisma.vendorProduct.fields.lowStockThreshold as unknown as number,
        },
      },
      orderBy: { stockQuantity: 'asc' },
    });
  }
}
