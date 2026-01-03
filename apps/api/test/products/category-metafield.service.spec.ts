/**
 * Category Metafield Service Unit Tests
 * Phase 2: Shopify-Inspired Product Management
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  CategoryMetafieldService,
  CreateMetafieldDefinitionDto,
  UpdateMetafieldDefinitionDto,
  SetProductMetafieldValueDto,
} from '../../src/products/services/category-metafield.service';
import { MetafieldType } from '@prisma/client';

describe('CategoryMetafieldService', () => {
  let service: CategoryMetafieldService;
  let prismaService: PrismaService;

  const mockCompanyId = 'company-123';
  const mockCategoryId = 'category-123';
  const mockProductId = 'product-123';
  const mockDefinitionId = 'definition-123';

  const mockCategory = {
    id: mockCategoryId,
    companyId: mockCompanyId,
    name: 'Coffee',
    slug: 'coffee',
    deletedAt: null,
  };

  const mockDefinition = {
    id: mockDefinitionId,
    categoryId: mockCategoryId,
    key: 'roast_level',
    name: 'Roast Level',
    type: MetafieldType.SELECT,
    required: false,
    options: ['Light', 'Medium', 'Dark'],
    validation: null,
    helpText: 'Select the roast level',
    placeholder: null,
    defaultValue: null,
    sortOrder: 0,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory,
  };

  const mockProduct = {
    id: mockProductId,
    companyId: mockCompanyId,
    name: 'Test Coffee',
    deletedAt: null,
  };

  const mockPrisma = {
    category: {
      findFirst: jest.fn(),
    },
    categoryMetafieldDefinition: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    productMetafieldValue: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryMetafieldService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CategoryMetafieldService>(CategoryMetafieldService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createDefinition', () => {
    const validDto: CreateMetafieldDefinitionDto = {
      key: 'origin_country',
      name: 'Origin Country',
      type: MetafieldType.TEXT,
    };

    it('should create a metafield definition successfully', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(null); // sortOrder check
      mockPrisma.categoryMetafieldDefinition.create.mockResolvedValue({
        ...mockDefinition,
        key: validDto.key,
        name: validDto.name,
        type: validDto.type,
      });

      const result = await service.createDefinition(
        mockCompanyId,
        mockCategoryId,
        validDto,
      );

      expect(result).toBeDefined();
      expect(result.key).toBe(validDto.key);
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if key already exists', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(mockDefinition);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, validDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid key format - starting with number', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, {
          ...validDto,
          key: '123invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid key format - uppercase', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, {
          ...validDto,
          key: 'InvalidKey',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid key format - hyphens', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, {
          ...validDto,
          key: 'invalid-key',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for key exceeding 64 characters', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, {
          ...validDto,
          key: 'a'.repeat(65),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for SELECT type without options', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, {
          key: 'select_field',
          name: 'Select Field',
          type: MetafieldType.SELECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for MULTI_SELECT type without options', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.createDefinition(mockCompanyId, mockCategoryId, {
          key: 'multi_field',
          name: 'Multi Field',
          type: MetafieldType.MULTI_SELECT,
          options: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create SELECT field with options', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.categoryMetafieldDefinition.create.mockResolvedValue({
        ...mockDefinition,
        type: MetafieldType.SELECT,
        options: ['Option1', 'Option2'],
      });

      const result = await service.createDefinition(mockCompanyId, mockCategoryId, {
        key: 'select_field',
        name: 'Select Field',
        type: MetafieldType.SELECT,
        options: ['Option1', 'Option2'],
      });

      expect(result.type).toBe(MetafieldType.SELECT);
    });
  });

  describe('getDefinitions', () => {
    it('should return all active definitions for a category', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([mockDefinition]);

      const result = await service.getDefinitions(mockCompanyId, mockCategoryId);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(mockDefinition.key);
    });

    it('should include inactive definitions when flag is set', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        mockDefinition,
        { ...mockDefinition, id: 'def-2', isActive: false },
      ]);

      const result = await service.getDefinitions(mockCompanyId, mockCategoryId, true);

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.getDefinitions(mockCompanyId, mockCategoryId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefinition', () => {
    it('should return a single definition', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(mockDefinition);

      const result = await service.getDefinition(
        mockCompanyId,
        mockCategoryId,
        mockDefinitionId,
      );

      expect(result.id).toBe(mockDefinitionId);
    });

    it('should throw NotFoundException if definition not found', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.getDefinition(mockCompanyId, mockCategoryId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if company mismatch', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue({
        ...mockDefinition,
        category: { ...mockCategory, companyId: 'other-company' },
      });

      await expect(
        service.getDefinition(mockCompanyId, mockCategoryId, mockDefinitionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDefinition', () => {
    const updateDto: UpdateMetafieldDefinitionDto = {
      name: 'Updated Name',
      helpText: 'Updated help text',
    };

    it('should update a definition successfully', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(mockDefinition);
      mockPrisma.categoryMetafieldDefinition.update.mockResolvedValue({
        ...mockDefinition,
        ...updateDto,
      });

      const result = await service.updateDefinition(
        mockCompanyId,
        mockCategoryId,
        mockDefinitionId,
        updateDto,
      );

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException if definition not found', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDefinition(
          mockCompanyId,
          mockCategoryId,
          mockDefinitionId,
          updateDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDefinition', () => {
    it('should soft delete a definition', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(mockDefinition);
      mockPrisma.categoryMetafieldDefinition.update.mockResolvedValue({
        ...mockDefinition,
        deletedAt: new Date(),
      });

      await service.deleteDefinition(
        mockCompanyId,
        mockCategoryId,
        mockDefinitionId,
        'user-123',
      );

      expect(mockPrisma.categoryMetafieldDefinition.update).toHaveBeenCalledWith({
        where: { id: mockDefinitionId },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        }),
      });
    });

    it('should throw NotFoundException if definition not found', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDefinition(mockCompanyId, mockCategoryId, mockDefinitionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderDefinitions', () => {
    it('should reorder definitions', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([mockDefinition]);

      const result = await service.reorderDefinitions(mockCompanyId, mockCategoryId, [
        'def-1',
        'def-2',
        'def-3',
      ]);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderDefinitions(mockCompanyId, mockCategoryId, []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductMetafields', () => {
    it('should return all metafield values for a product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productMetafieldValue.findMany.mockResolvedValue([
        {
          id: 'value-1',
          productId: mockProductId,
          definitionId: mockDefinitionId,
          textValue: 'Light',
          numberValue: null,
          booleanValue: null,
          dateValue: null,
          jsonValue: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          definition: mockDefinition,
        },
      ]);

      const result = await service.getProductMetafields(mockCompanyId, mockProductId);

      expect(result).toHaveLength(1);
      expect(result[0].textValue).toBe('Light');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.getProductMetafields(mockCompanyId, mockProductId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setProductMetafields', () => {
    it('should set metafield values for a product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([mockDefinition]);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.productMetafieldValue.findMany.mockResolvedValue([]);

      const values: SetProductMetafieldValueDto[] = [
        {
          definitionId: mockDefinitionId,
          textValue: 'Light',
        },
      ];

      const result = await service.setProductMetafields(
        mockCompanyId,
        mockProductId,
        values,
      );

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, textValue: 'test' },
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if definition not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: 'nonexistent', textValue: 'test' },
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid SELECT option', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([mockDefinition]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, textValue: 'InvalidOption' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for required field without value', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        { ...mockDefinition, required: true },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate URL field - reject javascript protocol', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        { ...mockDefinition, type: MetafieldType.URL, options: null },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, textValue: 'javascript:alert(1)' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate URL field - accept https', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        { ...mockDefinition, type: MetafieldType.URL, options: null },
      ]);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.productMetafieldValue.findMany.mockResolvedValue([]);

      const result = await service.setProductMetafields(mockCompanyId, mockProductId, [
        { definitionId: mockDefinitionId, textValue: 'https://example.com' },
      ]);

      expect(result).toBeDefined();
    });

    it('should validate COLOR field - reject invalid format', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        { ...mockDefinition, type: MetafieldType.COLOR, options: null },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, textValue: 'red' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate NUMBER field - reject value below min', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        {
          ...mockDefinition,
          type: MetafieldType.NUMBER,
          options: null,
          validation: { min: 0, max: 100 },
        },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, numberValue: -5 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate DATE field - reject invalid date', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        { ...mockDefinition, type: MetafieldType.DATE, options: null },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, dateValue: 'not-a-date' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate BOOLEAN field - reject non-boolean', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        { ...mockDefinition, type: MetafieldType.BOOLEAN, options: null },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, booleanValue: 'yes' as unknown as boolean },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle regex pattern errors gracefully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.categoryMetafieldDefinition.findMany.mockResolvedValue([
        {
          ...mockDefinition,
          type: MetafieldType.TEXT,
          options: null,
          validation: { pattern: '[invalid(regex' },
        },
      ]);

      await expect(
        service.setProductMetafields(mockCompanyId, mockProductId, [
          { definitionId: mockDefinitionId, textValue: 'test' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteProductMetafield', () => {
    it('should delete a metafield value', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productMetafieldValue.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteProductMetafield(
        mockCompanyId,
        mockProductId,
        mockDefinitionId,
      );

      expect(mockPrisma.productMetafieldValue.deleteMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteProductMetafield(mockCompanyId, mockProductId, mockDefinitionId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
