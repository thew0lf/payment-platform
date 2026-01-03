/**
 * Category Metafield Service
 * Manages metafield definitions for categories and values for products
 * Part of Shopify-Inspired Product Management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetafieldType, Prisma } from '@prisma/client';

// ============================================================
// DTOs
// ============================================================

export interface CreateMetafieldDefinitionDto {
  key: string;
  name: string;
  type: MetafieldType;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  helpText?: string;
  placeholder?: string;
  defaultValue?: string;
  sortOrder?: number;
}

export interface UpdateMetafieldDefinitionDto {
  name?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  helpText?: string;
  placeholder?: string;
  defaultValue?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SetProductMetafieldValueDto {
  definitionId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: Date | string;
  jsonValue?: any;
}

export interface MetafieldDefinitionResponse {
  id: string;
  categoryId: string;
  key: string;
  name: string;
  type: MetafieldType;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMetafieldValueResponse {
  id: string;
  productId: string;
  definitionId: string;
  definition: MetafieldDefinitionResponse;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: Date;
  jsonValue?: any;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Service
// ============================================================

@Injectable()
export class CategoryMetafieldService {
  private readonly logger = new Logger(CategoryMetafieldService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Metafield Definition CRUD
  // ============================================================

  /**
   * Create a new metafield definition for a category
   */
  async createDefinition(
    companyId: string,
    categoryId: string,
    dto: CreateMetafieldDefinitionDto,
  ): Promise<MetafieldDefinitionResponse> {
    // Verify category exists and belongs to company
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(
        'We couldn\'t find this category. It may have been deleted or you may not have access to it.',
      );
    }

    // Check for duplicate key (only among non-deleted definitions)
    const existing = await this.prisma.categoryMetafieldDefinition.findFirst({
      where: { categoryId, key: dto.key, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(
        `A custom field with the identifier "${dto.key}" already exists in this category. Try a different identifier.`,
      );
    }

    // Validate key format (lowercase letters, numbers, underscores only)
    if (!/^[a-z][a-z0-9_]*$/.test(dto.key)) {
      throw new BadRequestException(
        'The field identifier must start with a lowercase letter and can only contain lowercase letters, numbers, and underscores (e.g., "roast_level").',
      );
    }

    // Limit key length
    if (dto.key.length > 64) {
      throw new BadRequestException(
        'The field identifier must be 64 characters or less.',
      );
    }

    // Validate options for SELECT/MULTI_SELECT types
    if (
      (dto.type === MetafieldType.SELECT || dto.type === MetafieldType.MULTI_SELECT) &&
      (!dto.options || dto.options.length === 0)
    ) {
      throw new BadRequestException(
        'Dropdown fields require at least one option. Please add options for users to choose from.',
      );
    }

    // Get highest sortOrder for this category
    const lastDefinition = await this.prisma.categoryMetafieldDefinition.findFirst({
      where: { categoryId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = dto.sortOrder ?? (lastDefinition?.sortOrder ?? -1) + 1;

    const definition = await this.prisma.categoryMetafieldDefinition.create({
      data: {
        categoryId,
        key: dto.key,
        name: dto.name,
        type: dto.type,
        required: dto.required ?? false,
        options: dto.options ? (dto.options as unknown as Prisma.InputJsonValue) : undefined,
        validation: dto.validation
          ? (dto.validation as unknown as Prisma.InputJsonValue)
          : undefined,
        helpText: dto.helpText,
        placeholder: dto.placeholder,
        defaultValue: dto.defaultValue,
        sortOrder,
        isActive: true,
      },
    });

    return this.formatDefinitionResponse(definition);
  }

  /**
   * Get all metafield definitions for a category
   */
  async getDefinitions(
    companyId: string,
    categoryId: string,
    includeInactive = false,
  ): Promise<MetafieldDefinitionResponse[]> {
    // Verify category exists and belongs to company
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(
        'We couldn\'t find this category. It may have been deleted or you may not have access to it.',
      );
    }

    const where: Prisma.CategoryMetafieldDefinitionWhereInput = {
      categoryId,
      deletedAt: null,
    };
    if (!includeInactive) {
      where.isActive = true;
    }

    const definitions = await this.prisma.categoryMetafieldDefinition.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return definitions.map((d) => this.formatDefinitionResponse(d));
  }

  /**
   * Get a single metafield definition by ID
   */
  async getDefinition(
    companyId: string,
    categoryId: string,
    definitionId: string,
  ): Promise<MetafieldDefinitionResponse> {
    const definition = await this.prisma.categoryMetafieldDefinition.findFirst({
      where: { id: definitionId, categoryId, deletedAt: null },
      include: { category: true },
    });

    if (!definition || definition.category.companyId !== companyId) {
      throw new NotFoundException(
        'We couldn\'t find this custom field. It may have been deleted or you may not have access to it.',
      );
    }

    return this.formatDefinitionResponse(definition);
  }

  /**
   * Update a metafield definition
   */
  async updateDefinition(
    companyId: string,
    categoryId: string,
    definitionId: string,
    dto: UpdateMetafieldDefinitionDto,
  ): Promise<MetafieldDefinitionResponse> {
    const existing = await this.prisma.categoryMetafieldDefinition.findFirst({
      where: { id: definitionId, categoryId, deletedAt: null },
      include: { category: true },
    });

    if (!existing || existing.category.companyId !== companyId) {
      throw new NotFoundException(
        'We couldn\'t find this custom field. It may have been deleted or you may not have access to it.',
      );
    }

    const definition = await this.prisma.categoryMetafieldDefinition.update({
      where: { id: definitionId },
      data: {
        name: dto.name,
        required: dto.required,
        options: dto.options
          ? (dto.options as unknown as Prisma.InputJsonValue)
          : undefined,
        validation: dto.validation
          ? (dto.validation as unknown as Prisma.InputJsonValue)
          : undefined,
        helpText: dto.helpText,
        placeholder: dto.placeholder,
        defaultValue: dto.defaultValue,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });

    return this.formatDefinitionResponse(definition);
  }

  /**
   * Delete a metafield definition (soft delete)
   */
  async deleteDefinition(
    companyId: string,
    categoryId: string,
    definitionId: string,
    deletedBy?: string,
  ): Promise<void> {
    const existing = await this.prisma.categoryMetafieldDefinition.findFirst({
      where: { id: definitionId, categoryId, deletedAt: null },
      include: { category: true },
    });

    if (!existing || existing.category.companyId !== companyId) {
      throw new NotFoundException(
        'We couldn\'t find this custom field. It may have been deleted or you may not have access to it.',
      );
    }

    await this.prisma.categoryMetafieldDefinition.update({
      where: { id: definitionId },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  /**
   * Reorder metafield definitions
   */
  async reorderDefinitions(
    companyId: string,
    categoryId: string,
    definitionIds: string[],
  ): Promise<MetafieldDefinitionResponse[]> {
    // Verify category exists and belongs to company
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(
        'We couldn\'t find this category. It may have been deleted or you may not have access to it.',
      );
    }

    // Update sortOrder for each definition
    await this.prisma.$transaction(
      definitionIds.map((id, index) =>
        this.prisma.categoryMetafieldDefinition.updateMany({
          where: { id, categoryId, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getDefinitions(companyId, categoryId);
  }

  // ============================================================
  // Product Metafield Values
  // ============================================================

  /**
   * Get all metafield values for a product
   */
  async getProductMetafields(
    companyId: string,
    productId: string,
  ): Promise<ProductMetafieldValueResponse[]> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        'We couldn\'t find this product. It may have been deleted or you may not have access to it.',
      );
    }

    const values = await this.prisma.productMetafieldValue.findMany({
      where: { productId },
      include: {
        definition: true,
      },
    });

    return values.map((v) => ({
      id: v.id,
      productId: v.productId,
      definitionId: v.definitionId,
      definition: this.formatDefinitionResponse(v.definition),
      textValue: v.textValue || undefined,
      numberValue: v.numberValue ? Number(v.numberValue) : undefined,
      booleanValue: v.booleanValue ?? undefined,
      dateValue: v.dateValue || undefined,
      jsonValue: v.jsonValue || undefined,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));
  }

  /**
   * Set multiple metafield values for a product
   * Uses batch loading to avoid N+1 queries
   */
  async setProductMetafields(
    companyId: string,
    productId: string,
    values: SetProductMetafieldValueDto[],
  ): Promise<ProductMetafieldValueResponse[]> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        `We couldn't find this product. It may have been deleted or you may not have access to it.`,
      );
    }

    if (values.length === 0) {
      return this.getProductMetafields(companyId, productId);
    }

    // Batch load all definitions at once to avoid N+1 queries
    const definitionIds = values.map((v) => v.definitionId);
    const definitions = await this.prisma.categoryMetafieldDefinition.findMany({
      where: {
        id: { in: definitionIds },
        deletedAt: null,
      },
    });

    // Create a map for quick lookup
    const definitionMap = new Map(definitions.map((d) => [d.id, d]));

    // Validate all values before any database writes
    for (const value of values) {
      const definition = definitionMap.get(value.definitionId);
      if (!definition) {
        throw new NotFoundException(
          `The custom field "${value.definitionId}" doesn't exist or has been removed. Please refresh and try again.`,
        );
      }
      this.validateMetafieldValue(definition, value);
    }

    // Use a transaction for atomic updates
    await this.prisma.$transaction(
      values.map((value) =>
        this.prisma.productMetafieldValue.upsert({
          where: {
            productId_definitionId: {
              productId,
              definitionId: value.definitionId,
            },
          },
          update: {
            textValue: value.textValue,
            numberValue: value.numberValue,
            booleanValue: value.booleanValue,
            dateValue: value.dateValue ? new Date(value.dateValue) : null,
            jsonValue: value.jsonValue
              ? (value.jsonValue as Prisma.InputJsonValue)
              : null,
          },
          create: {
            productId,
            definitionId: value.definitionId,
            textValue: value.textValue,
            numberValue: value.numberValue,
            booleanValue: value.booleanValue,
            dateValue: value.dateValue ? new Date(value.dateValue) : null,
            jsonValue: value.jsonValue
              ? (value.jsonValue as Prisma.InputJsonValue)
              : null,
          },
        }),
      ),
    );

    return this.getProductMetafields(companyId, productId);
  }

  /**
   * Delete a single metafield value for a product
   */
  async deleteProductMetafield(
    companyId: string,
    productId: string,
    definitionId: string,
  ): Promise<void> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        'We couldn\'t find this product. It may have been deleted or you may not have access to it.',
      );
    }

    await this.prisma.productMetafieldValue.deleteMany({
      where: { productId, definitionId },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * Validates metafield value against its definition type and constraints.
   * Includes security measures against ReDoS attacks and URL protocol injection.
   */
  private validateMetafieldValue(
    definition: {
      type: MetafieldType;
      required: boolean;
      options?: unknown;
      validation?: unknown;
      name?: string;
    },
    value: SetProductMetafieldValueDto,
  ): void {
    const { type, required, options, validation, name } = definition;
    const fieldName = name || 'This field';

    // Check required
    if (required) {
      const hasValue =
        value.textValue !== undefined ||
        value.numberValue !== undefined ||
        value.booleanValue !== undefined ||
        value.dateValue !== undefined ||
        value.jsonValue !== undefined;
      if (!hasValue) {
        throw new BadRequestException(`${fieldName} is required. Please provide a value.`);
      }
    }

    // Type-specific validation
    switch (type) {
      case MetafieldType.SELECT:
        if (value.textValue !== undefined && value.textValue !== null) {
          if (!options || !Array.isArray(options)) {
            throw new BadRequestException(
              `${fieldName} has no options configured. Please contact support.`,
            );
          }
          const validOptions = options as string[];
          if (!validOptions.includes(value.textValue)) {
            throw new BadRequestException(
              `"${value.textValue}" is not a valid choice for ${fieldName}. Available options: ${validOptions.join(', ')}`,
            );
          }
        }
        break;

      case MetafieldType.MULTI_SELECT:
        if (value.jsonValue !== undefined && value.jsonValue !== null) {
          if (!Array.isArray(value.jsonValue)) {
            throw new BadRequestException(
              `${fieldName} requires an array of selected options.`,
            );
          }
          if (!options || !Array.isArray(options)) {
            throw new BadRequestException(
              `${fieldName} has no options configured. Please contact support.`,
            );
          }
          const validOptions = options as string[];
          const selectedOptions = value.jsonValue as string[];
          for (const opt of selectedOptions) {
            if (typeof opt !== 'string') {
              throw new BadRequestException(
                `${fieldName} options must be text values.`,
              );
            }
            if (!validOptions.includes(opt)) {
              throw new BadRequestException(
                `"${opt}" is not a valid choice for ${fieldName}. Available options: ${validOptions.join(', ')}`,
              );
            }
          }
        }
        break;

      case MetafieldType.NUMBER:
        if (value.numberValue !== undefined && value.numberValue !== null) {
          if (typeof value.numberValue !== 'number' || isNaN(value.numberValue)) {
            throw new BadRequestException(
              `${fieldName} must be a valid number.`,
            );
          }
          if (validation && typeof validation === 'object') {
            const { min, max } = validation as { min?: number; max?: number };
            if (min !== undefined && value.numberValue < min) {
              throw new BadRequestException(
                `${fieldName} must be at least ${min}.`,
              );
            }
            if (max !== undefined && value.numberValue > max) {
              throw new BadRequestException(
                `${fieldName} must be no more than ${max}.`,
              );
            }
          }
        }
        break;

      case MetafieldType.BOOLEAN:
        if (value.booleanValue !== undefined && value.booleanValue !== null) {
          if (typeof value.booleanValue !== 'boolean') {
            throw new BadRequestException(
              `${fieldName} must be true or false.`,
            );
          }
        }
        break;

      case MetafieldType.DATE:
        if (value.dateValue !== undefined && value.dateValue !== null) {
          const dateObj = new Date(value.dateValue);
          if (isNaN(dateObj.getTime())) {
            throw new BadRequestException(
              `${fieldName} must be a valid date. Use format: YYYY-MM-DD`,
            );
          }
        }
        break;

      case MetafieldType.TEXT:
      case MetafieldType.TEXTAREA:
        if (value.textValue !== undefined && value.textValue !== null) {
          if (typeof value.textValue !== 'string') {
            throw new BadRequestException(
              `${fieldName} must be text.`,
            );
          }
          if (validation && typeof validation === 'object') {
            const { minLength, maxLength, pattern } = validation as {
              minLength?: number;
              maxLength?: number;
              pattern?: string;
            };
            if (minLength !== undefined && value.textValue.length < minLength) {
              throw new BadRequestException(
                `${fieldName} must be at least ${minLength} characters.`,
              );
            }
            if (maxLength !== undefined && value.textValue.length > maxLength) {
              throw new BadRequestException(
                `${fieldName} must be no more than ${maxLength} characters.`,
              );
            }
            // Safe regex execution with ReDoS protection
            if (pattern) {
              try {
                // Limit pattern length to prevent complex regex attacks
                if (pattern.length > 500) {
                  this.logger.warn(`Regex pattern too long for field validation: ${pattern.length} chars`);
                  throw new BadRequestException(
                    `${fieldName} has an invalid validation pattern. Please contact support.`,
                  );
                }
                const regex = new RegExp(pattern);
                // Use timeout-safe matching by limiting input length for regex
                const testValue = value.textValue.slice(0, 10000);
                if (!regex.test(testValue)) {
                  throw new BadRequestException(
                    `${fieldName} doesn't match the required format.`,
                  );
                }
              } catch (error) {
                if (error instanceof BadRequestException) {
                  throw error;
                }
                // Log regex errors for debugging but don't expose to user
                this.logger.error(`Invalid regex pattern in metafield validation: ${pattern}`, error);
                throw new BadRequestException(
                  `${fieldName} has an invalid validation pattern. Please contact support.`,
                );
              }
            }
          }
        }
        break;

      case MetafieldType.URL:
        if (value.textValue !== undefined && value.textValue !== null) {
          if (typeof value.textValue !== 'string') {
            throw new BadRequestException(
              `${fieldName} must be a valid URL.`,
            );
          }
          try {
            const url = new URL(value.textValue);
            // Security: Only allow http and https protocols
            const allowedProtocols = ['http:', 'https:'];
            if (!allowedProtocols.includes(url.protocol)) {
              throw new BadRequestException(
                `${fieldName} must use http or https. Other protocols are not allowed.`,
              );
            }
          } catch (error) {
            if (error instanceof BadRequestException) {
              throw error;
            }
            throw new BadRequestException(
              `${fieldName} must be a valid URL (e.g., https://example.com).`,
            );
          }
        }
        break;

      case MetafieldType.COLOR:
        if (value.textValue !== undefined && value.textValue !== null) {
          if (typeof value.textValue !== 'string') {
            throw new BadRequestException(
              `${fieldName} must be a hex color code.`,
            );
          }
          if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value.textValue)) {
            throw new BadRequestException(
              `${fieldName} must be a valid hex color (e.g., #FF5500 or #F50).`,
            );
          }
        }
        break;

      default:
        // Unknown type - log warning but allow
        this.logger.warn(`Unknown metafield type: ${type}`);
    }
  }

  private formatDefinitionResponse(definition: any): MetafieldDefinitionResponse {
    return {
      id: definition.id,
      categoryId: definition.categoryId,
      key: definition.key,
      name: definition.name,
      type: definition.type,
      required: definition.required,
      options: definition.options as string[] | undefined,
      validation: definition.validation as Record<string, unknown> | undefined,
      helpText: definition.helpText || undefined,
      placeholder: definition.placeholder || undefined,
      defaultValue: definition.defaultValue || undefined,
      sortOrder: definition.sortOrder,
      isActive: definition.isActive,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
  }
}
