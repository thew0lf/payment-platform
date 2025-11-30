import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import {
  CreateInventoryLocationDto,
  UpdateInventoryLocationDto,
} from '../dto/inventory-location.dto';

@Injectable()
export class InventoryLocationService {
  private readonly logger = new Logger(InventoryLocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get all locations for a company
   */
  async findAll(companyId: string, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    const locations = await this.prisma.inventoryLocation.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { inventoryLevels: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return locations;
  }

  /**
   * Get a single location by ID
   */
  async findOne(locationId: string, user: UserContext) {
    const location = await this.prisma.inventoryLocation.findUnique({
      where: { id: locationId },
      include: {
        _count: {
          select: { inventoryLevels: true },
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.validateCompanyAccess(user, location.companyId);

    return location;
  }

  /**
   * Create a new location
   */
  async create(companyId: string, dto: CreateInventoryLocationDto, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    // Check for duplicate code within company
    const existingCode = await this.prisma.inventoryLocation.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: dto.code,
        },
      },
    });

    if (existingCode) {
      throw new ConflictException(`Location code "${dto.code}" already exists`);
    }

    // If this is the first location or marked as default, handle default setting
    const existingLocations = await this.prisma.inventoryLocation.count({
      where: { companyId },
    });

    const isDefault = dto.isDefault ?? existingLocations === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.prisma.inventoryLocation.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await this.prisma.inventoryLocation.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        type: dto.type ?? 'WAREHOUSE',
        address1: dto.address1,
        address2: dto.address2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        isActive: dto.isActive ?? true,
        isDefault,
      },
    });

    this.logger.log(`Created location "${dto.name}" for company ${companyId}`);

    return location;
  }

  /**
   * Update a location
   */
  async update(locationId: string, dto: UpdateInventoryLocationDto, user: UserContext) {
    const existing = await this.findOne(locationId, user);

    // Check for duplicate code if changing
    if (dto.code && dto.code.toUpperCase() !== existing.code) {
      const duplicateCode = await this.prisma.inventoryLocation.findUnique({
        where: {
          companyId_code: {
            companyId: existing.companyId,
            code: dto.code.toUpperCase(),
          },
        },
      });

      if (duplicateCode) {
        throw new ConflictException(`Location code "${dto.code}" already exists`);
      }
    }

    // Handle default flag changes
    if (dto.isDefault === true && !existing.isDefault) {
      await this.prisma.inventoryLocation.updateMany({
        where: { companyId: existing.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await this.prisma.inventoryLocation.update({
      where: { id: locationId },
      data: {
        name: dto.name,
        code: dto.code?.toUpperCase(),
        type: dto.type,
        address1: dto.address1,
        address2: dto.address2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        isActive: dto.isActive,
        isDefault: dto.isDefault,
      },
    });

    this.logger.log(`Updated location ${locationId}`);

    return location;
  }

  /**
   * Delete a location
   */
  async remove(locationId: string, user: UserContext) {
    const existing = await this.findOne(locationId, user);

    // Check if location has inventory
    const inventoryCount = await this.prisma.inventoryLevel.count({
      where: { locationId },
    });

    if (inventoryCount > 0) {
      throw new ConflictException(
        'Cannot delete location with existing inventory. Transfer or clear inventory first.',
      );
    }

    await this.prisma.inventoryLocation.delete({
      where: { id: locationId },
    });

    this.logger.log(`Deleted location ${locationId}`);
  }

  /**
   * Set a location as default
   */
  async setDefault(locationId: string, user: UserContext) {
    const existing = await this.findOne(locationId, user);

    // Unset all other defaults for this company
    await this.prisma.inventoryLocation.updateMany({
      where: { companyId: existing.companyId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const location = await this.prisma.inventoryLocation.update({
      where: { id: locationId },
      data: { isDefault: true },
    });

    this.logger.log(`Set location ${locationId} as default`);

    return location;
  }

  /**
   * Get the default location for a company
   */
  async getDefault(companyId: string, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    const location = await this.prisma.inventoryLocation.findFirst({
      where: { companyId, isDefault: true },
    });

    return location;
  }

  /**
   * Validate user has access to company
   */
  private async validateCompanyAccess(user: UserContext, companyId: string) {
    const hasAccess = await this.hierarchyService.canAccessCompany(user, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this company');
    }
  }
}
