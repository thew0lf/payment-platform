/**
 * Core: Sales Channels & Category Metafields Seed
 * Creates default sales channels for companies and example metafield definitions
 * Part of Shopify-Inspired Product Management System
 */

import { PrismaClient, SalesChannelType, MetafieldType } from '@prisma/client';

/**
 * Interface for metafield template definitions
 */
interface MetafieldTemplate {
  key: string;
  name: string;
  type: MetafieldType;
  required?: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string;
  sortOrder: number;
}

/**
 * Default sales channels that every company should have
 */
export const DEFAULT_SALES_CHANNELS = [
  {
    name: 'Online Store',
    slug: 'online-store',
    type: SalesChannelType.ONLINE_STORE,
    description: 'Your primary web storefront for online orders',
    isDefault: true,
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Point of Sale (POS)',
    slug: 'pos',
    type: SalesChannelType.POS,
    description: 'In-person sales at retail locations and events',
    isDefault: false,
    isActive: false, // Disabled by default, enable when POS integration is set up
    sortOrder: 1,
  },
  {
    name: 'Wholesale',
    slug: 'wholesale',
    type: SalesChannelType.WHOLESALE,
    description: 'Wholesale channel for bulk pricing and B2B orders',
    isDefault: false,
    isActive: false,
    sortOrder: 2,
  },
];

/**
 * Example metafield definitions for common product categories
 * These serve as templates that can be copied when creating new categories
 */
export const EXAMPLE_METAFIELD_TEMPLATES: Record<string, MetafieldTemplate[]> = {
  coffee: [
    {
      key: 'roast_level',
      name: 'Roast Level',
      type: MetafieldType.SELECT,
      required: true,
      options: ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'],
      helpText: 'Roast darkness—affects flavor intensity and body',
      sortOrder: 0,
    },
    {
      key: 'origin',
      name: 'Origin',
      type: MetafieldType.TEXT,
      required: true,
      placeholder: 'e.g., Colombia, Ethiopia, Brazil',
      helpText: 'Country or region where the coffee is sourced',
      sortOrder: 1,
    },
    {
      key: 'flavor_notes',
      name: 'Flavor Notes',
      type: MetafieldType.MULTI_SELECT,
      required: false,
      options: [
        'Chocolate',
        'Caramel',
        'Nutty',
        'Fruity',
        'Citrus',
        'Berry',
        'Floral',
        'Earthy',
        'Spicy',
        'Sweet',
        'Bright',
        'Smooth',
      ],
      helpText: 'Choose flavors customers will taste—helps shoppers find their perfect roast',
      sortOrder: 2,
    },
    {
      key: 'processing_method',
      name: 'Processing Method',
      type: MetafieldType.SELECT,
      required: false,
      options: ['Washed', 'Natural', 'Honey', 'Wet-Hulled', 'Other'],
      helpText: 'Method used after harvest (affects flavor profile)',
      sortOrder: 3,
    },
    {
      key: 'altitude',
      name: 'Altitude',
      type: MetafieldType.NUMBER,
      required: false,
      validation: { min: 0, max: 3000 },
      helpText: 'Growing altitude in meters (higher = more complex flavor)',
      placeholder: '1500',
      sortOrder: 4,
    },
    {
      key: 'harvest_date',
      name: 'Harvest Date',
      type: MetafieldType.DATE,
      required: false,
      helpText: 'Harvest date (affects freshness and seasonal availability)',
      sortOrder: 5,
    },
    {
      key: 'is_single_origin',
      name: 'Single Origin',
      type: MetafieldType.BOOLEAN,
      required: false,
      helpText: 'Single-origin coffees showcase unique regional flavors',
      sortOrder: 6,
    },
  ],
  apparel: [
    {
      key: 'material',
      name: 'Material',
      type: MetafieldType.TEXT,
      required: true,
      placeholder: 'e.g., 100% Cotton, Cotton-Polyester Blend',
      helpText: 'Primary material composition',
      sortOrder: 0,
    },
    {
      key: 'care_instructions',
      name: 'Care Instructions',
      type: MetafieldType.TEXTAREA,
      required: false,
      placeholder: 'Machine wash cold, tumble dry low, do not bleach',
      helpText: 'Washing and care instructions',
      sortOrder: 1,
    },
    {
      key: 'fit_type',
      name: 'Fit Type',
      type: MetafieldType.SELECT,
      required: false,
      options: ['Slim', 'Regular', 'Relaxed', 'Oversized'],
      helpText: 'Fit style—helps shoppers choose the right size',
      sortOrder: 2,
    },
    {
      key: 'country_of_origin',
      name: 'Country of Origin',
      type: MetafieldType.TEXT,
      required: false,
      placeholder: 'e.g., USA, Portugal, Vietnam',
      helpText: 'Where the product was manufactured',
      sortOrder: 3,
    },
  ],
  electronics: [
    {
      key: 'warranty_months',
      name: 'Warranty Period',
      type: MetafieldType.NUMBER,
      required: false,
      validation: { min: 0, max: 120 },
      helpText: 'Warranty length in months (e.g., 12 for 1 year)',
      placeholder: '12',
      sortOrder: 0,
    },
    {
      key: 'power_specs',
      name: 'Power Specifications',
      type: MetafieldType.TEXT,
      required: false,
      placeholder: 'e.g., 100-240V, 50/60Hz',
      helpText: 'Voltage and power requirements',
      sortOrder: 1,
    },
    {
      key: 'certification',
      name: 'Certifications',
      type: MetafieldType.MULTI_SELECT,
      required: false,
      options: ['CE', 'FCC', 'UL', 'RoHS', 'Energy Star'],
      helpText: 'Safety and compliance certifications (required for some marketplaces)',
      sortOrder: 2,
    },
    {
      key: 'product_manual_url',
      name: 'Product Manual URL',
      type: MetafieldType.URL,
      required: false,
      placeholder: 'https://example.com/manual.pdf',
      helpText: 'Link to product manual or documentation',
      sortOrder: 3,
    },
  ],
  food: [
    {
      key: 'ingredients',
      name: 'Ingredients',
      type: MetafieldType.TEXTAREA,
      required: true,
      helpText: 'Complete ingredient list (required by law in most regions)',
      sortOrder: 0,
    },
    {
      key: 'allergens',
      name: 'Allergens',
      type: MetafieldType.MULTI_SELECT,
      required: false, // Changed to optional - leave blank if no allergens
      options: [
        'Milk',
        'Eggs',
        'Fish',
        'Shellfish',
        'Tree Nuts',
        'Peanuts',
        'Wheat',
        'Soybeans',
        'Sesame',
      ],
      helpText: 'Select all allergens present, or leave blank if none',
      sortOrder: 1,
    },
    {
      key: 'shelf_life_days',
      name: 'Shelf Life (days)',
      type: MetafieldType.NUMBER,
      required: false,
      validation: { min: 1, max: 1825 }, // Increased to 5 years for canned goods
      helpText: 'Product shelf life in days',
      sortOrder: 2,
    },
    {
      key: 'storage_instructions',
      name: 'Storage Instructions',
      type: MetafieldType.TEXT,
      required: false,
      placeholder: 'e.g., Store in a cool, dry place',
      helpText: 'How to store the product for maximum freshness',
      sortOrder: 3,
    },
    {
      key: 'is_organic',
      name: 'Certified Organic',
      type: MetafieldType.BOOLEAN,
      required: false,
      helpText: 'USDA or equivalent organic certification',
      sortOrder: 4,
    },
  ],
};

/**
 * Seed default sales channels for a specific company
 */
export async function seedSalesChannelsForCompany(
  prisma: PrismaClient,
  companyId: string,
): Promise<void> {
  console.log(`  📢 Seeding sales channels for company ${companyId}...`);

  for (const channel of DEFAULT_SALES_CHANNELS) {
    // Use findFirst + create pattern since Prisma doesn't handle null in composite unique constraints
    const existing = await prisma.salesChannel.findFirst({
      where: {
        companyId,
        slug: channel.slug,
        deletedAt: null,
      },
    });

    if (!existing) {
      await prisma.salesChannel.create({
        data: {
          companyId,
          ...channel,
        },
      });
    }
  }

  console.log(`    ✓ Created ${DEFAULT_SALES_CHANNELS.length} sales channels`);
}

/**
 * Seed metafield definitions for a category based on a template
 */
export async function seedMetafieldsForCategory(
  prisma: PrismaClient,
  categoryId: string,
  templateName: string,
): Promise<void> {
  const template = EXAMPLE_METAFIELD_TEMPLATES[templateName];
  if (!template) {
    console.warn(`    ⚠ No metafield template found for "${templateName}"`);
    return;
  }

  console.log(`  📋 Seeding ${template.length} metafields for category (${templateName})...`);

  for (const field of template) {
    // Use findFirst + create pattern since Prisma doesn't handle null in composite unique constraints
    const existing = await prisma.categoryMetafieldDefinition.findFirst({
      where: {
        categoryId,
        key: field.key,
        deletedAt: null,
      },
    });

    if (!existing) {
      await prisma.categoryMetafieldDefinition.create({
        data: {
          categoryId,
          key: field.key,
          name: field.name,
          type: field.type,
          required: field.required ?? false,
          options: field.options ? (field.options as unknown as object) : undefined,
          validation: field.validation ? (field.validation as unknown as object) : undefined,
          helpText: field.helpText,
          placeholder: field.placeholder,
          defaultValue: field.defaultValue,
          sortOrder: field.sortOrder,
          isActive: true,
        },
      });
    }
  }

  console.log(`    ✓ Created ${template.length} metafield definitions`);
}

/**
 * Main seed function - seeds sales channels for all existing companies
 * and adds example metafields to coffee categories (for demo purposes)
 */
export async function seedSalesChannels(prisma: PrismaClient): Promise<void> {
  console.log('🛒 Seeding Sales Channels & Metafields...');

  // Get all active companies
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  if (companies.length === 0) {
    console.log('  ℹ No companies found, skipping sales channel seeding');
    return;
  }

  // Seed sales channels for each company
  for (const company of companies) {
    console.log(`  🏢 Processing company: ${company.name}`);
    await seedSalesChannelsForCompany(prisma, company.id);
  }

  // Find coffee-related categories and add metafields as examples
  // Only match categories with 'coffee' in name or slug to avoid false matches like "Roasted Vegetables"
  const coffeeCategories = await prisma.category.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: 'coffee', mode: 'insensitive' } },
        { slug: { contains: 'coffee', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, companyId: true },
  });

  if (coffeeCategories.length > 0) {
    console.log(`  ☕ Found ${coffeeCategories.length} coffee categories, adding metafields...`);
    for (const category of coffeeCategories) {
      await seedMetafieldsForCategory(prisma, category.id, 'coffee');
    }
  }

  console.log('✅ Sales Channels & Metafields seeding complete!');
}
