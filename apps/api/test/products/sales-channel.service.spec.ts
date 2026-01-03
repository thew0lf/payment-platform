/**
 * Sales Channel Service Unit Tests
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
  SalesChannelService,
  CreateSalesChannelDto,
  UpdateSalesChannelDto,
  PublishProductToChannelDto,
  BulkPublishDto,
} from '../../src/products/services/sales-channel.service';
import { SalesChannelType } from '@prisma/client';

describe('SalesChannelService', () => {
  let service: SalesChannelService;
  let prismaService: PrismaService;

  const mockCompanyId = 'company-123';
  const mockChannelId = 'channel-123';
  const mockProductId = 'product-123';

  const mockChannel = {
    id: mockChannelId,
    companyId: mockCompanyId,
    name: 'Online Store',
    slug: 'online-store',
    type: SalesChannelType.ONLINE_STORE,
    description: 'Main online store',
    iconUrl: null,
    settings: null,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { products: 10 },
  };

  const mockProduct = {
    id: mockProductId,
    companyId: mockCompanyId,
    name: 'Test Product',
    deletedAt: null,
  };

  const mockProductChannel = {
    id: 'pc-123',
    productId: mockProductId,
    channelId: mockChannelId,
    isPublished: true,
    publishedAt: new Date(),
    channelPrice: null,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    channel: mockChannel,
  };

  const mockPrisma = {
    salesChannel: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    productSalesChannel: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((fn) => {
      if (typeof fn === 'function') {
        return fn(mockPrisma);
      }
      return Promise.all(fn);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset $transaction to default implementation (gets overwritten by mockRejectedValue)
    mockPrisma.$transaction.mockImplementation((fn) => {
      if (typeof fn === 'function') {
        return fn(mockPrisma);
      }
      return Promise.all(fn);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesChannelService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SalesChannelService>(SalesChannelService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    const validDto: CreateSalesChannelDto = {
      name: 'Wholesale',
      type: SalesChannelType.WHOLESALE,
    };

    it('should create a sales channel successfully', async () => {
      mockPrisma.salesChannel.findFirst
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce(null); // sortOrder
      mockPrisma.salesChannel.create.mockResolvedValue({
        ...mockChannel,
        name: validDto.name,
        slug: 'wholesale',
        type: validDto.type,
      });

      const result = await service.create(mockCompanyId, validDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(validDto.name);
    });

    it('should generate slug from name if not provided', async () => {
      mockPrisma.salesChannel.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.salesChannel.create.mockResolvedValue({
        ...mockChannel,
        name: 'My Custom Store',
        slug: 'my-custom-store',
      });

      const result = await service.create(mockCompanyId, {
        name: 'My Custom Store',
        type: SalesChannelType.CUSTOM,
      });

      expect(result.slug).toBe('my-custom-store');
    });

    it('should throw ConflictException if slug already exists', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);

      await expect(
        service.create(mockCompanyId, validDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid slug - uppercase', async () => {
      await expect(
        service.create(mockCompanyId, {
          ...validDto,
          slug: 'InvalidSlug',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid slug - underscores', async () => {
      await expect(
        service.create(mockCompanyId, {
          ...validDto,
          slug: 'invalid_slug',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for slug exceeding 64 characters', async () => {
      await expect(
        service.create(mockCompanyId, {
          ...validDto,
          slug: 'a'.repeat(65),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other defaults when creating with isDefault=true', async () => {
      mockPrisma.salesChannel.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.salesChannel.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.salesChannel.create.mockResolvedValue({
        ...mockChannel,
        isDefault: true,
      });

      await service.create(mockCompanyId, {
        ...validDto,
        isDefault: true,
      });

      expect(mockPrisma.salesChannel.updateMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });
    });

    it('should accept valid slug formats', async () => {
      const validSlugs = ['store', 'online-store', 'store-2024', '123-store'];

      for (const slug of validSlugs) {
        mockPrisma.salesChannel.findFirst
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        mockPrisma.salesChannel.create.mockResolvedValue({
          ...mockChannel,
          slug,
        });

        const result = await service.create(mockCompanyId, {
          name: 'Test',
          slug,
          type: SalesChannelType.CUSTOM,
        });

        expect(result.slug).toBe(slug);
      }
    });
  });

  describe('findAll', () => {
    it('should return all active channels', async () => {
      mockPrisma.salesChannel.findMany.mockResolvedValue([mockChannel]);

      const result = await service.findAll(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockChannel.name);
    });

    it('should include inactive channels when flag is set', async () => {
      mockPrisma.salesChannel.findMany.mockResolvedValue([
        mockChannel,
        { ...mockChannel, id: 'channel-2', isActive: false },
      ]);

      const result = await service.findAll(mockCompanyId, true);

      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return a channel by ID', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);

      const result = await service.findById(mockCompanyId, mockChannelId);

      expect(result.id).toBe(mockChannelId);
    });

    it('should throw NotFoundException if channel not found', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockCompanyId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSalesChannelDto = {
      name: 'Updated Store',
      description: 'Updated description',
    };

    it('should update a channel successfully', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.salesChannel.update.mockResolvedValue({
        ...mockChannel,
        ...updateDto,
      });

      const result = await service.update(mockCompanyId, mockChannelId, updateDto);

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException if channel not found', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockCompanyId, mockChannelId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check for slug conflicts when changing slug', async () => {
      mockPrisma.salesChannel.findFirst
        .mockResolvedValueOnce(mockChannel)
        .mockResolvedValueOnce({ id: 'other-channel' }); // slug conflict

      await expect(
        service.update(mockCompanyId, mockChannelId, { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate slug format when updating', async () => {
      await expect(
        service.update(mockCompanyId, mockChannelId, { slug: 'Invalid_Slug!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other defaults when setting isDefault=true', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue({
        ...mockChannel,
        isDefault: false,
      });
      mockPrisma.salesChannel.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.salesChannel.update.mockResolvedValue({
        ...mockChannel,
        isDefault: true,
      });

      await service.update(mockCompanyId, mockChannelId, { isDefault: true });

      expect(mockPrisma.salesChannel.updateMany).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete a channel', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue({
        ...mockChannel,
        isDefault: false,
      });
      mockPrisma.salesChannel.update.mockResolvedValue({
        ...mockChannel,
        deletedAt: new Date(),
      });

      await service.delete(mockCompanyId, mockChannelId, 'user-123');

      expect(mockPrisma.salesChannel.update).toHaveBeenCalledWith({
        where: { id: mockChannelId },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        }),
      });
    });

    it('should throw NotFoundException if channel not found', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(mockCompanyId, mockChannelId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting default channel', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel); // isDefault: true

      await expect(
        service.delete(mockCompanyId, mockChannelId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should reorder channels', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.salesChannel.findMany.mockResolvedValue([mockChannel]);

      const result = await service.reorder(mockCompanyId, ['c1', 'c2', 'c3']);

      expect(result).toBeDefined();
    });
  });

  describe('getProductChannels', () => {
    it('should return all channels for a product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productSalesChannel.findMany.mockResolvedValue([mockProductChannel]);

      const result = await service.getProductChannels(mockCompanyId, mockProductId);

      expect(result).toHaveLength(1);
      expect(result[0].isPublished).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.getProductChannels(mockCompanyId, mockProductId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishToChannel', () => {
    const publishDto: PublishProductToChannelDto = {
      channelId: mockChannelId,
      isPublished: true,
    };

    it('should publish a product to a channel', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.productSalesChannel.upsert.mockResolvedValue(mockProductChannel);

      const result = await service.publishToChannel(
        mockCompanyId,
        mockProductId,
        publishDto,
      );

      expect(result.isPublished).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.publishToChannel(mockCompanyId, mockProductId, publishDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if channel not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.publishToChannel(mockCompanyId, mockProductId, publishDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set publishedAt when publishing', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.productSalesChannel.upsert.mockResolvedValue(mockProductChannel);

      await service.publishToChannel(mockCompanyId, mockProductId, publishDto);

      expect(mockPrisma.productSalesChannel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            publishedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should clear publishedAt when unpublishing', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.productSalesChannel.upsert.mockResolvedValue({
        ...mockProductChannel,
        isPublished: false,
        publishedAt: null,
      });

      await service.publishToChannel(mockCompanyId, mockProductId, {
        channelId: mockChannelId,
        isPublished: false,
      });

      expect(mockPrisma.productSalesChannel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            publishedAt: null,
          }),
        }),
      );
    });
  });

  describe('updateProductChannels', () => {
    it('should update multiple channels at once', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.productSalesChannel.upsert.mockResolvedValue(mockProductChannel);
      mockPrisma.productSalesChannel.findMany.mockResolvedValue([mockProductChannel]);

      const result = await service.updateProductChannels(mockCompanyId, mockProductId, [
        { channelId: mockChannelId, isPublished: true },
      ]);

      expect(result).toHaveLength(1);
    });
  });

  describe('unpublishFromChannel', () => {
    it('should unpublish a product from a channel', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.productSalesChannel.deleteMany.mockResolvedValue({ count: 1 });

      await service.unpublishFromChannel(mockCompanyId, mockProductId, mockChannelId);

      expect(mockPrisma.productSalesChannel.deleteMany).toHaveBeenCalledWith({
        where: { productId: mockProductId, channelId: mockChannelId },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.unpublishFromChannel(mockCompanyId, mockProductId, mockChannelId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkPublish', () => {
    const bulkDto: BulkPublishDto = {
      productIds: ['prod-1', 'prod-2', 'prod-3'],
      channelId: mockChannelId,
      isPublished: true,
    };

    it('should bulk publish products with batch loading', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
        { id: 'prod-3' },
      ]);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.bulkPublish(mockCompanyId, bulkDto);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should return empty result for empty productIds', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);

      const result = await service.bulkPublish(mockCompanyId, {
        ...bulkDto,
        productIds: [],
      });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should throw NotFoundException if channel not found', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.bulkPublish(mockCompanyId, bulkDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should report failed products that dont exist', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        // prod-2 and prod-3 not found
      ]);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.bulkPublish(mockCompanyId, bulkDto);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toBeDefined();
    });

    it('should handle transaction failures', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const result = await service.bulkPublish(mockCompanyId, {
        ...bulkDto,
        productIds: ['prod-1', 'prod-2'],
      });

      expect(result.failed).toBe(2);
      expect(result.errors).toContain('Failed to publish products. Please try again.');
    });
  });

  describe('getChannelProducts', () => {
    it('should return products in a channel', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.productSalesChannel.findMany.mockResolvedValue([
        {
          ...mockProductChannel,
          product: mockProduct,
        },
      ]);
      mockPrisma.productSalesChannel.count.mockResolvedValue(1);

      const result = await service.getChannelProducts(mockCompanyId, mockChannelId);

      expect(result.products).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if channel not found', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);

      await expect(
        service.getChannelProducts(mockCompanyId, mockChannelId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply filters correctly', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(mockChannel);
      mockPrisma.productSalesChannel.findMany.mockResolvedValue([]);
      mockPrisma.productSalesChannel.count.mockResolvedValue(0);

      await service.getChannelProducts(mockCompanyId, mockChannelId, {
        publishedOnly: true,
        visibleOnly: true,
        limit: 10,
        offset: 5,
      });

      expect(mockPrisma.productSalesChannel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
            isVisible: true,
          }),
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('generateSlug helper', () => {
    it('should generate valid slugs from names', async () => {
      mockPrisma.salesChannel.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.salesChannel.create.mockImplementation((args) =>
        Promise.resolve({
          ...mockChannel,
          ...args.data,
        }),
      );

      const testCases = [
        { name: 'Online Store', expectedSlug: 'online-store' },
        { name: 'My  Custom   Store', expectedSlug: 'my-custom-store' },
        { name: '  Trimmed  ', expectedSlug: 'trimmed' },
      ];

      for (const { name, expectedSlug } of testCases) {
        mockPrisma.salesChannel.findFirst
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);

        const result = await service.create(mockCompanyId, {
          name,
          type: SalesChannelType.CUSTOM,
        });

        expect(result.slug).toBe(expectedSlug);
      }
    });
  });
});
