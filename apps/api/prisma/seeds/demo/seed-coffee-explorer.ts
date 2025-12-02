/**
 * Demo: Coffee Explorer Seed
 * Seeds the Coffee Explorer demo client with full configuration:
 * - Products (coffee bags with various origins and roast levels)
 * - Review configuration
 * - Sample reviews
 * - Customers
 */

import {
  PrismaClient,
  ScopeType,
  UserRole,
  ProductCategory,
  RoastLevel,
  ReviewStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Reserved codes that might be confusing
const RESERVED_CODES = new Set([
  '0000',
  'AAAA',
  'TEST',
  'DEMO',
  'NULL',
  'NONE',
  'XXXX',
  'ZZZZ',
]);

function extractCodeFromName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length >= 4) {
    return clean.slice(0, 4);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = clean;
  while (code.length < 4) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateUniqueCode(
  name: string,
  existingCodes: Set<string>,
): string {
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

  existingCodes.add(code);
  return code;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedCoffeeExplorer(
  prisma: PrismaClient,
  organizationId: string,
) {
  console.log('☕ Seeding Coffee Explorer demo...');

  const allUsedCodes = new Set<string>();

  // Get existing codes
  const existingClients = await prisma.client.findMany({
    select: { code: true },
  });
  const existingCompanies = await prisma.company.findMany({
    select: { code: true },
  });
  existingClients.forEach((c) => c.code && allUsedCodes.add(c.code));
  existingCompanies.forEach((c) => c.code && allUsedCodes.add(c.code));

  // Create Coffee Explorer Client
  const clientCode = generateUniqueCode('Coffee Explorer', allUsedCodes);
  const client = await prisma.client.upsert({
    where: {
      organizationId_slug: { organizationId, slug: 'coffee-explorer' },
    },
    update: { code: clientCode },
    create: {
      organizationId,
      name: 'Coffee Explorer',
      slug: 'coffee-explorer',
      code: clientCode,
      contactName: 'Alex Brewster',
      contactEmail: 'alex@coffeeexplorer.com',
      plan: 'PREMIUM',
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ Client: Coffee Explorer', `(${clientCode})`);

  // Client Admin User
  const adminPassword = await bcrypt.hash('demo123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@coffeeexplorer.com' },
    update: {},
    create: {
      email: 'admin@coffeeexplorer.com',
      passwordHash: adminPassword,
      firstName: 'Alex',
      lastName: 'Brewster',
      scopeType: ScopeType.CLIENT,
      scopeId: client.id,
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      clientId: client.id,
    },
  });
  console.log('  ✓ Admin: admin@coffeeexplorer.com');

  // Create Company: Coffee Explorer Store
  const companyCode = generateUniqueCode('CE Store', allUsedCodes);
  const company = await prisma.company.upsert({
    where: {
      clientId_slug: { clientId: client.id, slug: 'ce-store' },
    },
    update: { code: companyCode },
    create: {
      clientId: client.id,
      name: 'Coffee Explorer Store',
      slug: 'ce-store',
      code: companyCode,
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ Company: Coffee Explorer Store', `(${companyCode})`);

  // Store Manager
  const managerPassword = await bcrypt.hash('demo123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@coffeeexplorer.com' },
    update: {},
    create: {
      email: 'manager@coffeeexplorer.com',
      passwordHash: managerPassword,
      firstName: 'Jamie',
      lastName: 'Roast',
      scopeType: ScopeType.COMPANY,
      scopeId: company.id,
      role: UserRole.MANAGER,
      status: 'ACTIVE',
      companyId: company.id,
      clientId: client.id,
    },
  });
  console.log('  ✓ Manager: manager@coffeeexplorer.com');

  // Payment Provider (Stripe)
  await prisma.paymentProvider.upsert({
    where: { id: `${company.id}-stripe` },
    update: {},
    create: {
      id: `${company.id}-stripe`,
      companyId: company.id,
      name: 'Stripe',
      type: 'STRIPE',
      encryptedCredentials: 'encrypted_placeholder',
      isDefault: true,
      isActive: true,
      priority: 1,
      environment: 'sandbox',
    },
  });
  console.log('  ✓ Payment Provider: Stripe');

  // Seed Products
  const products = await seedCoffeeProducts(prisma, company.id);
  console.log(`  ✓ Products: ${products.length} coffee products`);

  // Seed Review Config
  await seedReviewConfig(prisma, company.id);
  console.log('  ✓ Review configuration');

  // Seed Sample Customers
  const customers = await seedCoffeeCustomers(prisma, company.id);
  console.log(`  ✓ Customers: ${customers.length} sample customers`);

  // Seed Sample Reviews
  const reviews = await seedSampleReviews(prisma, company.id, products);
  console.log(`  ✓ Reviews: ${reviews} sample reviews`);

  return { client, company, products };
}

async function seedCoffeeProducts(prisma: PrismaClient, companyId: string) {
  const coffeeProducts = [
    {
      sku: 'CE-ETH-YIR-001',
      name: 'Ethiopian Yirgacheffe',
      slug: 'ethiopian-yirgacheffe',
      description:
        'A bright, fruity coffee with notes of blueberry, citrus, and jasmine. Light roast to highlight its natural flavors.',
      price: 18.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Single Origin',
      roastLevel: RoastLevel.LIGHT,
      origin: 'Ethiopia',
      flavorNotes: ['Blueberry', 'Citrus', 'Jasmine', 'Honey'],
      process: 'Washed',
      altitude: '1700-2200m',
      varietal: 'Heirloom',
    },
    {
      sku: 'CE-COL-HUI-001',
      name: 'Colombian Huila',
      slug: 'colombian-huila',
      description:
        'A well-balanced coffee with caramel sweetness, nutty undertones, and a smooth chocolate finish.',
      price: 16.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Single Origin',
      roastLevel: RoastLevel.MEDIUM,
      origin: 'Colombia',
      flavorNotes: ['Caramel', 'Chocolate', 'Walnut', 'Red Apple'],
      process: 'Washed',
      altitude: '1500-1800m',
      varietal: 'Caturra',
    },
    {
      sku: 'CE-GTM-ANT-001',
      name: 'Guatemala Antigua',
      slug: 'guatemala-antigua',
      description:
        'Rich and full-bodied with complex spice notes, dark chocolate, and a smoky finish.',
      price: 17.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Single Origin',
      roastLevel: RoastLevel.MEDIUM_DARK,
      origin: 'Guatemala',
      flavorNotes: ['Dark Chocolate', 'Spice', 'Smoke', 'Brown Sugar'],
      process: 'Washed',
      altitude: '1500-1700m',
      varietal: 'Bourbon',
    },
    {
      sku: 'CE-BRA-MOG-001',
      name: 'Brazil Mogiana',
      slug: 'brazil-mogiana',
      description:
        'A classic Brazilian coffee with low acidity, nutty flavors, and rich chocolate notes.',
      price: 14.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Single Origin',
      roastLevel: RoastLevel.DARK,
      origin: 'Brazil',
      flavorNotes: ['Hazelnut', 'Cocoa', 'Toffee', 'Low Acidity'],
      process: 'Natural',
      altitude: '900-1100m',
      varietal: 'Mundo Novo',
    },
    {
      sku: 'CE-KEN-AA-001',
      name: 'Kenya AA',
      slug: 'kenya-aa',
      description:
        'Bold and complex with wine-like acidity, blackcurrant notes, and a syrupy body.',
      price: 21.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Single Origin',
      roastLevel: RoastLevel.LIGHT,
      origin: 'Kenya',
      flavorNotes: ['Blackcurrant', 'Grapefruit', 'Wine', 'Tomato'],
      process: 'Washed',
      altitude: '1700-1900m',
      varietal: 'SL28',
    },
    {
      sku: 'CE-SUM-MAN-001',
      name: 'Sumatra Mandheling',
      slug: 'sumatra-mandheling',
      description:
        'Earthy and full-bodied with herbal notes, dark chocolate, and a long finish.',
      price: 19.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Single Origin',
      roastLevel: RoastLevel.DARK,
      origin: 'Indonesia',
      flavorNotes: ['Earth', 'Herbs', 'Dark Chocolate', 'Tobacco'],
      process: 'Wet-hulled',
      altitude: '1100-1600m',
      varietal: 'Typica',
    },
    {
      sku: 'CE-BLD-SIG-001',
      name: 'Signature Blend',
      slug: 'signature-blend',
      description:
        'Our house blend combining coffees from three continents for perfect balance.',
      price: 15.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Blend',
      roastLevel: RoastLevel.MEDIUM,
      origin: 'Multi-origin',
      flavorNotes: ['Chocolate', 'Caramel', 'Citrus', 'Balanced'],
      process: 'Mixed',
      altitude: 'Various',
    },
    {
      sku: 'CE-BLD-ESP-001',
      name: 'Espresso Roast',
      slug: 'espresso-roast',
      description:
        'Crafted for espresso with intense chocolate, caramel, and a thick crema.',
      price: 16.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Blend',
      roastLevel: RoastLevel.DARK,
      origin: 'Multi-origin',
      flavorNotes: ['Espresso Crema', 'Bittersweet Chocolate', 'Caramel'],
      process: 'Mixed',
      altitude: 'Various',
    },
    {
      sku: 'CE-DEC-SWP-001',
      name: 'Swiss Water Decaf',
      slug: 'swiss-water-decaf',
      description:
        'All the flavor, none of the caffeine. Smooth, sweet, and perfect for evenings.',
      price: 17.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Decaf',
      roastLevel: RoastLevel.MEDIUM,
      origin: 'Colombia',
      flavorNotes: ['Milk Chocolate', 'Graham Cracker', 'Stone Fruit'],
      process: 'Swiss Water',
      altitude: '1500-1700m',
    },
    {
      sku: 'CE-GEI-PAN-001',
      name: 'Panama Geisha',
      slug: 'panama-geisha',
      description:
        'The pinnacle of specialty coffee. Floral, tea-like, with exceptional complexity.',
      price: 45.99,
      category: ProductCategory.COFFEE,
      subcategory: 'Reserve',
      roastLevel: RoastLevel.LIGHT,
      origin: 'Panama',
      flavorNotes: ['Jasmine', 'Bergamot', 'Peach', 'Tea-like'],
      process: 'Washed',
      altitude: '1600-1800m',
      varietal: 'Gesha',
    },
  ];

  const createdProducts = [];

  for (const product of coffeeProducts) {
    // Use findFirst + upsert pattern since unique constraint includes deletedAt
    const existing = await prisma.product.findFirst({
      where: {
        companyId,
        sku: product.sku,
        deletedAt: null,
      },
    });

    let created;
    if (existing) {
      created = existing;
    } else {
      created = await prisma.product.create({
        data: {
          companyId,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          currency: 'USD',
          category: product.category,
          subcategory: product.subcategory,
          roastLevel: product.roastLevel,
          origin: product.origin,
          flavorNotes: product.flavorNotes,
          process: product.process,
          altitude: product.altitude,
          varietal: product.varietal,
          status: 'ACTIVE',
          stockQuantity: Math.floor(Math.random() * 200) + 50,
          weight: 12,
          weightUnit: 'oz',
          isSubscribable: true,
          subscriptionDiscount: 10, // 10% off for subscribers
        },
      });
    }
    createdProducts.push(created);
  }

  return createdProducts;
}

async function seedReviewConfig(prisma: PrismaClient, companyId: string) {
  return prisma.reviewConfig.upsert({
    where: { companyId },
    update: {},
    create: {
      companyId,
      enabled: true,
      autoApprove: false,
      minRatingForAutoApprove: 4, // Auto-approve 4+ star reviews
      requireVerifiedPurchase: false,
      allowAnonymous: true,
      allowMedia: true,
      allowProsAndCons: true,
      showVerifiedBadge: true,
      showReviewerName: true,
      showReviewDate: true,
      sortDefault: 'newest',
      minReviewLength: 10,
      maxReviewLength: 2000,
      maxMediaPerReview: 5,
      moderationKeywords: ['spam', 'fake', 'scam'],
    },
  });
}

async function seedCoffeeCustomers(
  prisma: PrismaClient,
  companyId: string,
) {
  const customers = [
    {
      email: 'sarah.coffee@example.com',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      city: 'Seattle',
      state: 'WA',
    },
    {
      email: 'james.brew@example.com',
      firstName: 'James',
      lastName: 'Rodriguez',
      city: 'Austin',
      state: 'TX',
    },
    {
      email: 'michelle.k@example.com',
      firstName: 'Michelle',
      lastName: 'Kim',
      city: 'Portland',
      state: 'OR',
    },
    {
      email: 'david.latte@example.com',
      firstName: 'David',
      lastName: 'Liu',
      city: 'Denver',
      state: 'CO',
    },
    {
      email: 'emma.espresso@example.com',
      firstName: 'Emma',
      lastName: 'Wilson',
      city: 'San Francisco',
      state: 'CA',
    },
  ];

  const createdCustomers = [];

  for (const customer of customers) {
    // Use findFirst + create pattern since unique constraint includes deletedAt
    const existing = await prisma.customer.findFirst({
      where: {
        companyId,
        email: customer.email,
        deletedAt: null,
      },
    });

    let created;
    if (existing) {
      created = existing;
    } else {
      created = await prisma.customer.create({
        data: {
          companyId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          status: 'ACTIVE',
          metadata: {
            city: customer.city,
            state: customer.state,
            country: 'US',
            preferredRoast: ['LIGHT', 'MEDIUM', 'DARK'][
              Math.floor(Math.random() * 3)
            ],
          },
        },
      });
    }
    createdCustomers.push(created);
  }

  return createdCustomers;
}

async function seedSampleReviews(
  prisma: PrismaClient,
  companyId: string,
  products: Array<{ id: string; name: string }>,
) {
  const reviewTexts = [
    {
      rating: 5,
      title: 'Best coffee I have ever tasted!',
      content:
        'The flavor profile is incredible. Complex, nuanced, and absolutely delicious. Will definitely order again!',
      name: 'Sarah M.',
      pros: ['Amazing flavor', 'Fresh roast', 'Fast shipping'],
      cons: [],
    },
    {
      rating: 5,
      title: 'Perfect morning ritual',
      content:
        'This coffee has transformed my mornings. The aroma alone is worth it, and the taste is even better.',
      name: 'James R.',
      pros: ['Great aroma', 'Consistent quality', 'Good price'],
      cons: [],
    },
    {
      rating: 4,
      title: 'Great quality, slight shipping delay',
      content:
        'The coffee itself is excellent - fresh and flavorful. Shipping took a bit longer than expected, but worth the wait.',
      name: 'Michelle K.',
      pros: ['Excellent taste', 'Fresh beans'],
      cons: ['Shipping time'],
    },
    {
      rating: 5,
      title: 'Exceptional quality',
      content:
        'You can taste the difference in quality. The tasting notes are spot-on and the freshness is unmatched.',
      name: 'David L.',
      pros: ['Premium quality', 'Accurate tasting notes', 'Fresh'],
      cons: [],
    },
    {
      rating: 4,
      title: 'Love the variety',
      content:
        'Great selection of single origins. Would love to see more decaf options, but overall very satisfied.',
      name: 'Emma W.',
      pros: ['Good variety', 'Quality beans'],
      cons: ['Limited decaf options'],
    },
  ];

  let reviewCount = 0;

  for (const product of products.slice(0, 5)) {
    // First 5 products
    const reviewsToAdd = reviewTexts.slice(
      0,
      Math.floor(Math.random() * 3) + 2,
    ); // 2-4 reviews per product

    for (const review of reviewsToAdd) {
      // Check if review already exists
      const existingReview = await prisma.productReview.findFirst({
        where: {
          companyId,
          productId: product.id,
          reviewerEmail: `${review.name.toLowerCase().replace(' ', '.')}@example.com`,
        },
      });

      if (!existingReview) {
        await prisma.productReview.create({
          data: {
            companyId,
            productId: product.id,
            rating: review.rating,
            title: review.title,
            content: review.content,
            reviewerName: review.name,
            reviewerEmail: `${review.name.toLowerCase().replace(' ', '.')}@example.com`,
            pros: review.pros,
            cons: review.cons,
            status: ReviewStatus.APPROVED,
            isVerifiedPurchase: Math.random() > 0.3,
            helpfulCount: Math.floor(Math.random() * 20),
            unhelpfulCount: Math.floor(Math.random() * 3),
          },
        });
        reviewCount++;
      }
    }
  }

  return reviewCount;
}
