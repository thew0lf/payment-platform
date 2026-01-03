/**
 * Unit Tests for Sales Channels & Metafields Seed Script
 * Phase 1: Shopify-Inspired Product Management
 */

import { MetafieldType, SalesChannelType } from '@prisma/client';
import {
  DEFAULT_SALES_CHANNELS,
  EXAMPLE_METAFIELD_TEMPLATES,
  seedSalesChannelsForCompany,
  seedMetafieldsForCategory,
  seedSalesChannels,
} from '../../prisma/seeds/core/seed-sales-channels';

// Mock PrismaClient
const mockPrisma = {
  salesChannel: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  categoryMetafieldDefinition: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
};

describe('Seed Sales Channels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('DEFAULT_SALES_CHANNELS', () => {
    it('should have exactly 3 default channels', () => {
      expect(DEFAULT_SALES_CHANNELS).toHaveLength(3);
    });

    it('should have Online Store as the first channel', () => {
      const onlineStore = DEFAULT_SALES_CHANNELS[0];
      expect(onlineStore.name).toBe('Online Store');
      expect(onlineStore.slug).toBe('online-store');
      expect(onlineStore.type).toBe(SalesChannelType.ONLINE_STORE);
      expect(onlineStore.isDefault).toBe(true);
      expect(onlineStore.isActive).toBe(true);
    });

    it('should have POS as the second channel', () => {
      const pos = DEFAULT_SALES_CHANNELS[1];
      expect(pos.name).toBe('Point of Sale (POS)');
      expect(pos.slug).toBe('pos');
      expect(pos.type).toBe(SalesChannelType.POS);
      expect(pos.isDefault).toBe(false);
      expect(pos.isActive).toBe(false); // Disabled by default
    });

    it('should have Wholesale as the third channel', () => {
      const wholesale = DEFAULT_SALES_CHANNELS[2];
      expect(wholesale.name).toBe('Wholesale');
      expect(wholesale.slug).toBe('wholesale');
      expect(wholesale.type).toBe(SalesChannelType.WHOLESALE);
      expect(wholesale.isDefault).toBe(false);
      expect(wholesale.isActive).toBe(false);
    });

    it('should have proper sortOrder values', () => {
      DEFAULT_SALES_CHANNELS.forEach((channel, index) => {
        expect(channel.sortOrder).toBe(index);
      });
    });

    it('should have descriptions for all channels', () => {
      DEFAULT_SALES_CHANNELS.forEach((channel) => {
        expect(channel.description).toBeDefined();
        expect(channel.description.length).toBeGreaterThan(10);
      });
    });

    it('should have unique slugs', () => {
      const slugs = DEFAULT_SALES_CHANNELS.map((c) => c.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe('EXAMPLE_METAFIELD_TEMPLATES', () => {
    it('should have templates for coffee, apparel, electronics, and food', () => {
      expect(EXAMPLE_METAFIELD_TEMPLATES).toHaveProperty('coffee');
      expect(EXAMPLE_METAFIELD_TEMPLATES).toHaveProperty('apparel');
      expect(EXAMPLE_METAFIELD_TEMPLATES).toHaveProperty('electronics');
      expect(EXAMPLE_METAFIELD_TEMPLATES).toHaveProperty('food');
    });

    describe('Coffee Template', () => {
      it('should have 7 metafield definitions', () => {
        expect(EXAMPLE_METAFIELD_TEMPLATES.coffee).toHaveLength(7);
      });

      it('should have roast_level as SELECT type', () => {
        const roastLevel = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'roast_level',
        );
        expect(roastLevel).toBeDefined();
        expect(roastLevel!.type).toBe(MetafieldType.SELECT);
        expect(roastLevel!.required).toBe(true);
        expect(roastLevel!.options).toContain('Light');
        expect(roastLevel!.options).toContain('Dark');
      });

      it('should have origin as TEXT type', () => {
        const origin = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'origin',
        );
        expect(origin).toBeDefined();
        expect(origin!.type).toBe(MetafieldType.TEXT);
        expect(origin!.required).toBe(true);
      });

      it('should have flavor_notes as MULTI_SELECT type', () => {
        const flavorNotes = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'flavor_notes',
        );
        expect(flavorNotes).toBeDefined();
        expect(flavorNotes!.type).toBe(MetafieldType.MULTI_SELECT);
        expect(flavorNotes!.options).toContain('Chocolate');
        expect(flavorNotes!.options).toContain('Fruity');
      });

      it('should have altitude as NUMBER type with validation', () => {
        const altitude = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'altitude',
        );
        expect(altitude).toBeDefined();
        expect(altitude!.type).toBe(MetafieldType.NUMBER);
        expect(altitude!.validation).toEqual({ min: 0, max: 3000 });
      });

      it('should have harvest_date as DATE type', () => {
        const harvestDate = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'harvest_date',
        );
        expect(harvestDate).toBeDefined();
        expect(harvestDate!.type).toBe(MetafieldType.DATE);
      });

      it('should have is_single_origin as BOOLEAN type', () => {
        const isSingleOrigin = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'is_single_origin',
        );
        expect(isSingleOrigin).toBeDefined();
        expect(isSingleOrigin!.type).toBe(MetafieldType.BOOLEAN);
      });

      it('should have processing_method with proper options (no Experimental)', () => {
        const processingMethod = EXAMPLE_METAFIELD_TEMPLATES.coffee.find(
          (f) => f.key === 'processing_method',
        );
        expect(processingMethod!.options).toContain('Other');
        expect(processingMethod!.options).not.toContain('Experimental');
      });

      it('should have unique keys', () => {
        const keys = EXAMPLE_METAFIELD_TEMPLATES.coffee.map((f) => f.key);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      });

      it('should have proper sortOrder values', () => {
        EXAMPLE_METAFIELD_TEMPLATES.coffee.forEach((field, index) => {
          expect(field.sortOrder).toBe(index);
        });
      });

      it('should have helpText for all fields', () => {
        EXAMPLE_METAFIELD_TEMPLATES.coffee.forEach((field) => {
          expect(field.helpText).toBeDefined();
          expect(field.helpText!.length).toBeGreaterThan(10);
        });
      });
    });

    describe('Apparel Template', () => {
      it('should have 4 metafield definitions', () => {
        expect(EXAMPLE_METAFIELD_TEMPLATES.apparel).toHaveLength(4);
      });

      it('should have material as required TEXT type', () => {
        const material = EXAMPLE_METAFIELD_TEMPLATES.apparel.find(
          (f) => f.key === 'material',
        );
        expect(material).toBeDefined();
        expect(material!.type).toBe(MetafieldType.TEXT);
        expect(material!.required).toBe(true);
      });

      it('should have care_instructions as TEXTAREA type', () => {
        const care = EXAMPLE_METAFIELD_TEMPLATES.apparel.find(
          (f) => f.key === 'care_instructions',
        );
        expect(care).toBeDefined();
        expect(care!.type).toBe(MetafieldType.TEXTAREA);
      });

      it('should have fit_type as SELECT type', () => {
        const fitType = EXAMPLE_METAFIELD_TEMPLATES.apparel.find(
          (f) => f.key === 'fit_type',
        );
        expect(fitType).toBeDefined();
        expect(fitType!.type).toBe(MetafieldType.SELECT);
        expect(fitType!.options).toContain('Slim');
        expect(fitType!.options).toContain('Relaxed');
      });
    });

    describe('Electronics Template', () => {
      it('should have 4 metafield definitions', () => {
        expect(EXAMPLE_METAFIELD_TEMPLATES.electronics).toHaveLength(4);
      });

      it('should have warranty_months as NUMBER with validation', () => {
        const warranty = EXAMPLE_METAFIELD_TEMPLATES.electronics.find(
          (f) => f.key === 'warranty_months',
        );
        expect(warranty).toBeDefined();
        expect(warranty!.type).toBe(MetafieldType.NUMBER);
        expect(warranty!.validation).toEqual({ min: 0, max: 120 });
      });

      it('should have product_manual_url as URL type', () => {
        const manualUrl = EXAMPLE_METAFIELD_TEMPLATES.electronics.find(
          (f) => f.key === 'product_manual_url',
        );
        expect(manualUrl).toBeDefined();
        expect(manualUrl!.type).toBe(MetafieldType.URL);
      });

      it('should have certification as MULTI_SELECT', () => {
        const cert = EXAMPLE_METAFIELD_TEMPLATES.electronics.find(
          (f) => f.key === 'certification',
        );
        expect(cert).toBeDefined();
        expect(cert!.type).toBe(MetafieldType.MULTI_SELECT);
        expect(cert!.options).toContain('CE');
        expect(cert!.options).toContain('FCC');
      });
    });

    describe('Food Template', () => {
      it('should have 5 metafield definitions', () => {
        expect(EXAMPLE_METAFIELD_TEMPLATES.food).toHaveLength(5);
      });

      it('should have ingredients as required TEXTAREA type', () => {
        const ingredients = EXAMPLE_METAFIELD_TEMPLATES.food.find(
          (f) => f.key === 'ingredients',
        );
        expect(ingredients).toBeDefined();
        expect(ingredients!.type).toBe(MetafieldType.TEXTAREA);
        expect(ingredients!.required).toBe(true);
      });

      it('should have allergens as optional MULTI_SELECT (no None option)', () => {
        const allergens = EXAMPLE_METAFIELD_TEMPLATES.food.find(
          (f) => f.key === 'allergens',
        );
        expect(allergens).toBeDefined();
        expect(allergens!.type).toBe(MetafieldType.MULTI_SELECT);
        expect(allergens!.required).toBe(false); // Should be optional
        expect(allergens!.options).not.toContain('None');
      });

      it('should have shelf_life_days with extended validation for canned goods', () => {
        const shelfLife = EXAMPLE_METAFIELD_TEMPLATES.food.find(
          (f) => f.key === 'shelf_life_days',
        );
        expect(shelfLife).toBeDefined();
        expect(shelfLife!.type).toBe(MetafieldType.NUMBER);
        expect(shelfLife!.validation).toEqual({ min: 1, max: 1825 }); // 5 years
      });

      it('should have is_organic as BOOLEAN type', () => {
        const isOrganic = EXAMPLE_METAFIELD_TEMPLATES.food.find(
          (f) => f.key === 'is_organic',
        );
        expect(isOrganic).toBeDefined();
        expect(isOrganic!.type).toBe(MetafieldType.BOOLEAN);
      });
    });

    describe('All Templates', () => {
      it('should not have string defaultValues for boolean fields', () => {
        Object.values(EXAMPLE_METAFIELD_TEMPLATES).forEach((template) => {
          template.forEach((field) => {
            if (field.type === MetafieldType.BOOLEAN && field.defaultValue) {
              expect(field.defaultValue).not.toBe('true');
              expect(field.defaultValue).not.toBe('false');
            }
          });
        });
      });
    });
  });

  describe('seedSalesChannelsForCompany', () => {
    const companyId = 'test-company-id';

    beforeEach(() => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);
      mockPrisma.salesChannel.create.mockResolvedValue({ id: 'channel-1' });
    });

    it('should create all default channels when none exist', async () => {
      await seedSalesChannelsForCompany(mockPrisma as any, companyId);

      expect(mockPrisma.salesChannel.findFirst).toHaveBeenCalledTimes(3);
      expect(mockPrisma.salesChannel.create).toHaveBeenCalledTimes(3);
    });

    it('should not create channels that already exist', async () => {
      mockPrisma.salesChannel.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' }) // Online Store exists
        .mockResolvedValueOnce(null) // POS doesn't exist
        .mockResolvedValueOnce(null); // Wholesale doesn't exist

      await seedSalesChannelsForCompany(mockPrisma as any, companyId);

      expect(mockPrisma.salesChannel.create).toHaveBeenCalledTimes(2);
    });

    it('should check for existing channels with deletedAt: null', async () => {
      await seedSalesChannelsForCompany(mockPrisma as any, companyId);

      expect(mockPrisma.salesChannel.findFirst).toHaveBeenCalledWith({
        where: {
          companyId,
          slug: 'online-store',
          deletedAt: null,
        },
      });
    });

    it('should create channels with correct data', async () => {
      await seedSalesChannelsForCompany(mockPrisma as any, companyId);

      expect(mockPrisma.salesChannel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId,
          name: 'Online Store',
          slug: 'online-store',
          type: SalesChannelType.ONLINE_STORE,
          isDefault: true,
          isActive: true,
        }),
      });
    });

    it('should be idempotent - running twice creates no duplicates', async () => {
      // First run - nothing exists
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);
      await seedSalesChannelsForCompany(mockPrisma as any, companyId);
      expect(mockPrisma.salesChannel.create).toHaveBeenCalledTimes(3);

      jest.clearAllMocks();

      // Second run - all exist
      mockPrisma.salesChannel.findFirst.mockResolvedValue({ id: 'existing' });
      await seedSalesChannelsForCompany(mockPrisma as any, companyId);
      expect(mockPrisma.salesChannel.create).toHaveBeenCalledTimes(0);
    });
  });

  describe('seedMetafieldsForCategory', () => {
    const categoryId = 'test-category-id';

    beforeEach(() => {
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);
      mockPrisma.categoryMetafieldDefinition.create.mockResolvedValue({
        id: 'metafield-1',
      });
    });

    it('should create all coffee metafields when none exist', async () => {
      await seedMetafieldsForCategory(mockPrisma as any, categoryId, 'coffee');

      expect(mockPrisma.categoryMetafieldDefinition.findFirst).toHaveBeenCalledTimes(7);
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(7);
    });

    it('should not create metafields that already exist', async () => {
      mockPrisma.categoryMetafieldDefinition.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' }) // roast_level exists
        .mockResolvedValueOnce({ id: 'existing-2' }) // origin exists
        .mockResolvedValueOnce(null) // rest don't exist
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await seedMetafieldsForCategory(mockPrisma as any, categoryId, 'coffee');

      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(5);
    });

    it('should log warning for unknown template', async () => {
      const warnSpy = jest.spyOn(console, 'warn');

      await seedMetafieldsForCategory(
        mockPrisma as any,
        categoryId,
        'unknown_template',
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No metafield template found'),
      );
      expect(mockPrisma.categoryMetafieldDefinition.create).not.toHaveBeenCalled();
    });

    it('should create metafields with correct data structure', async () => {
      await seedMetafieldsForCategory(mockPrisma as any, categoryId, 'coffee');

      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          categoryId,
          key: 'roast_level',
          name: 'Roast Level',
          type: MetafieldType.SELECT,
          required: true,
          isActive: true,
        }),
      });
    });

    it('should handle apparel template correctly', async () => {
      await seedMetafieldsForCategory(mockPrisma as any, categoryId, 'apparel');

      expect(mockPrisma.categoryMetafieldDefinition.findFirst).toHaveBeenCalledTimes(4);
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(4);
    });

    it('should be idempotent', async () => {
      // First run - nothing exists
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);
      await seedMetafieldsForCategory(mockPrisma as any, categoryId, 'coffee');
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(7);

      jest.clearAllMocks();

      // Second run - all exist
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue({
        id: 'existing',
      });
      await seedMetafieldsForCategory(mockPrisma as any, categoryId, 'coffee');
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(0);
    });
  });

  describe('seedSalesChannels (main function)', () => {
    beforeEach(() => {
      mockPrisma.company.findMany.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);
      mockPrisma.salesChannel.create.mockResolvedValue({ id: 'channel-1' });
      mockPrisma.categoryMetafieldDefinition.findFirst.mockResolvedValue(null);
      mockPrisma.categoryMetafieldDefinition.create.mockResolvedValue({
        id: 'metafield-1',
      });
    });

    it('should skip seeding when no companies exist', async () => {
      mockPrisma.company.findMany.mockResolvedValue([]);

      await seedSalesChannels(mockPrisma as any);

      expect(mockPrisma.salesChannel.create).not.toHaveBeenCalled();
    });

    it('should seed channels for all active companies', async () => {
      mockPrisma.company.findMany.mockResolvedValue([
        { id: 'company-1', name: 'Company 1' },
        { id: 'company-2', name: 'Company 2' },
      ]);

      await seedSalesChannels(mockPrisma as any);

      // 3 channels per company × 2 companies = 6 total
      expect(mockPrisma.salesChannel.create).toHaveBeenCalledTimes(6);
    });

    it('should only match coffee categories by name or slug (not roast)', async () => {
      mockPrisma.company.findMany.mockResolvedValue([
        { id: 'company-1', name: 'Test' },
      ]);

      await seedSalesChannels(mockPrisma as any);

      // Verify the category query doesn't include 'roast'
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: 'coffee', mode: 'insensitive' } },
            { slug: { contains: 'coffee', mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, companyId: true },
      });
    });

    it('should seed metafields for found coffee categories', async () => {
      mockPrisma.company.findMany.mockResolvedValue([
        { id: 'company-1', name: 'Test' },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Coffee Beans', companyId: 'company-1' },
      ]);

      await seedSalesChannels(mockPrisma as any);

      // 7 coffee metafields should be created
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(7);
    });

    it('should handle multiple coffee categories', async () => {
      mockPrisma.company.findMany.mockResolvedValue([
        { id: 'company-1', name: 'Test' },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Coffee Beans', companyId: 'company-1' },
        { id: 'cat-2', name: 'Ground Coffee', companyId: 'company-1' },
      ]);

      await seedSalesChannels(mockPrisma as any);

      // 7 metafields × 2 categories = 14 total
      expect(mockPrisma.categoryMetafieldDefinition.create).toHaveBeenCalledTimes(14);
    });
  });
});
