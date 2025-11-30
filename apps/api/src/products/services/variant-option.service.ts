import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import {
  CreateVariantOptionDto,
  UpdateVariantOptionDto,
  AddVariantOptionValueDto,
  ReorderOptionsDto,
  ReorderValuesDto,
} from '../dto/variant-option.dto';

@Injectable()
export class VariantOptionService {
  private readonly logger = new Logger(VariantOptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get all variant options for a company
   */
  async findAll(companyId: string, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    const options = await this.prisma.variantOption.findMany({
      where: { companyId },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return options;
  }

  /**
   * Get a single variant option by ID
   */
  async findOne(id: string, user: UserContext) {
    const option = await this.prisma.variantOption.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!option) {
      throw new NotFoundException('Variant option not found');
    }

    await this.validateCompanyAccess(user, option.companyId);

    return option;
  }

  /**
   * Create a new variant option with values
   */
  async create(companyId: string, dto: CreateVariantOptionDto, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    // Check for duplicate name within company
    const existing = await this.prisma.variantOption.findFirst({
      where: {
        companyId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Variant option "${dto.name}" already exists`);
    }

    // Get max sort order
    const maxSortOrder = await this.prisma.variantOption.aggregate({
      where: { companyId },
      _max: { sortOrder: true },
    });

    const option = await this.prisma.variantOption.create({
      data: {
        companyId,
        name: dto.name,
        displayName: dto.displayName,
        sortOrder: dto.sortOrder ?? (maxSortOrder._max.sortOrder ?? -1) + 1,
        values: {
          create: dto.values.map((value, index) => ({
            value: value.value,
            displayValue: value.displayValue,
            colorCode: value.colorCode,
            imageUrl: value.imageUrl,
            sortOrder: value.sortOrder ?? index,
          })),
        },
      },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Created variant option "${dto.name}" for company ${companyId}`);

    return option;
  }

  /**
   * Update a variant option and its values
   */
  async update(id: string, dto: UpdateVariantOptionDto, user: UserContext) {
    const option = await this.findOne(id, user);

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== option.name) {
      const existing = await this.prisma.variantOption.findFirst({
        where: {
          companyId: option.companyId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Variant option "${dto.name}" already exists`);
      }
    }

    // Handle values update if provided
    if (dto.values !== undefined) {
      // Get existing values
      const existingValues = option.values;
      const existingIds = new Set(existingValues.map(v => v.id));

      // Separate values into update, create, and delete
      const valuesToUpdate = dto.values.filter(v => v.id && existingIds.has(v.id));
      const valuesToCreate = dto.values.filter(v => !v.id);
      const idsToKeep = new Set(dto.values.filter(v => v.id).map(v => v.id));
      const idsToDelete = existingValues.filter(v => !idsToKeep.has(v.id)).map(v => v.id);

      // Use transaction for atomic update
      const updated = await this.prisma.$transaction(async (tx) => {
        // Delete removed values
        if (idsToDelete.length > 0) {
          await tx.variantOptionValue.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }

        // Update existing values
        for (const value of valuesToUpdate) {
          await tx.variantOptionValue.update({
            where: { id: value.id },
            data: {
              value: value.value,
              displayValue: value.displayValue,
              colorCode: value.colorCode,
              imageUrl: value.imageUrl,
              sortOrder: value.sortOrder,
            },
          });
        }

        // Create new values
        if (valuesToCreate.length > 0) {
          const maxSort = await tx.variantOptionValue.aggregate({
            where: { optionId: id },
            _max: { sortOrder: true },
          });

          await tx.variantOptionValue.createMany({
            data: valuesToCreate.map((value, index) => ({
              optionId: id,
              value: value.value!,
              displayValue: value.displayValue,
              colorCode: value.colorCode,
              imageUrl: value.imageUrl,
              sortOrder: value.sortOrder ?? (maxSort._max.sortOrder ?? -1) + index + 1,
            })),
          });
        }

        // Update the option itself
        return tx.variantOption.update({
          where: { id },
          data: {
            name: dto.name,
            displayName: dto.displayName,
            sortOrder: dto.sortOrder,
          },
          include: {
            values: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
      });

      this.logger.log(`Updated variant option ${id}`);
      return updated;
    }

    // Simple update without values
    const updated = await this.prisma.variantOption.update({
      where: { id },
      data: {
        name: dto.name,
        displayName: dto.displayName,
        sortOrder: dto.sortOrder,
      },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Updated variant option ${id}`);
    return updated;
  }

  /**
   * Delete a variant option and all its values
   */
  async remove(id: string, user: UserContext) {
    await this.findOne(id, user); // Validates access

    await this.prisma.variantOption.delete({
      where: { id },
    });

    this.logger.log(`Deleted variant option ${id}`);
  }

  /**
   * Add a value to an existing option
   */
  async addValue(optionId: string, dto: AddVariantOptionValueDto, user: UserContext) {
    const option = await this.findOne(optionId, user);

    // Check for duplicate value
    const existing = await this.prisma.variantOptionValue.findFirst({
      where: {
        optionId,
        value: { equals: dto.value, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Value "${dto.value}" already exists for this option`);
    }

    // Get max sort order
    const maxSortOrder = await this.prisma.variantOptionValue.aggregate({
      where: { optionId },
      _max: { sortOrder: true },
    });

    const value = await this.prisma.variantOptionValue.create({
      data: {
        optionId,
        value: dto.value,
        displayValue: dto.displayValue,
        colorCode: dto.colorCode,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });

    this.logger.log(`Added value "${dto.value}" to option ${optionId}`);
    return value;
  }

  /**
   * Remove a value from an option
   */
  async removeValue(optionId: string, valueId: string, user: UserContext) {
    await this.findOne(optionId, user); // Validates access

    const value = await this.prisma.variantOptionValue.findUnique({
      where: { id: valueId },
    });

    if (!value || value.optionId !== optionId) {
      throw new NotFoundException('Value not found');
    }

    await this.prisma.variantOptionValue.delete({
      where: { id: valueId },
    });

    this.logger.log(`Removed value ${valueId} from option ${optionId}`);
  }

  /**
   * Reorder options within a company
   */
  async reorderOptions(companyId: string, dto: ReorderOptionsDto, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    await this.prisma.$transaction(
      dto.optionIds.map((id, index) =>
        this.prisma.variantOption.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    this.logger.log(`Reordered variant options for company ${companyId}`);
  }

  /**
   * Reorder values within an option
   */
  async reorderValues(optionId: string, dto: ReorderValuesDto, user: UserContext) {
    await this.findOne(optionId, user); // Validates access

    await this.prisma.$transaction(
      dto.valueIds.map((id, index) =>
        this.prisma.variantOptionValue.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    this.logger.log(`Reordered values for option ${optionId}`);
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
