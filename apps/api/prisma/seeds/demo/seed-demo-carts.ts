/**
 * Demo: Cart Seed Data
 * Creates sample carts for the Coffee Explorer demo funnel in various states
 * - Active carts with products
 * - Abandoned carts for recovery testing
 * - Completed carts (converted to orders)
 * - Carts with discount codes applied
 */

import { PrismaClient, CartStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

// Demo discount codes available for testing
const DEMO_DISCOUNT_CODES = [
  { code: 'SAVE10', type: 'percentage', value: 10, description: '10% off your order' },
  { code: 'COFFEE20', type: 'percentage', value: 20, description: '20% off coffee' },
  { code: 'FIRST5', type: 'fixed', value: 5, description: '$5 off first order' },
  { code: 'FREESHIP', type: 'shipping', value: 0, description: 'Free shipping' },
];

interface DemoCartConfig {
  status: CartStatus;
  productCount: number;
  hasDiscount: boolean;
  discountCode?: string;
  daysAgo: number;
  customerEmail?: string;
  customerName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const DEMO_CART_CONFIGS: DemoCartConfig[] = [
  // Active carts - in-progress shopping
  {
    status: CartStatus.ACTIVE,
    productCount: 2,
    hasDiscount: false,
    daysAgo: 0,
    customerEmail: 'active.shopper@example.com',
    customerName: 'Active Shopper',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'coffee-lovers',
  },
  {
    status: CartStatus.ACTIVE,
    productCount: 1,
    hasDiscount: true,
    discountCode: 'SAVE10',
    daysAgo: 0,
    customerEmail: 'deal.hunter@example.com',
    customerName: 'Deal Hunter',
    utmSource: 'instagram',
    utmMedium: 'social',
  },
  {
    status: CartStatus.ACTIVE,
    productCount: 3,
    hasDiscount: false,
    daysAgo: 1,
    utmSource: 'email',
    utmMedium: 'newsletter',
    utmCampaign: 'weekly-deals',
  },

  // Abandoned carts - for recovery testing
  {
    status: CartStatus.ABANDONED,
    productCount: 2,
    hasDiscount: false,
    daysAgo: 2,
    customerEmail: 'forgot.checkout@example.com',
    customerName: 'Forgot Checkout',
    utmSource: 'facebook',
    utmMedium: 'social',
    utmCampaign: 'retargeting',
  },
  {
    status: CartStatus.ABANDONED,
    productCount: 4,
    hasDiscount: true,
    discountCode: 'COFFEE20',
    daysAgo: 3,
    customerEmail: 'price.sensitive@example.com',
    customerName: 'Price Sensitive',
    utmSource: 'google',
    utmMedium: 'organic',
  },
  {
    status: CartStatus.ABANDONED,
    productCount: 1,
    hasDiscount: false,
    daysAgo: 5,
    customerEmail: 'window.shopper@example.com',
    customerName: 'Window Shopper',
  },
  {
    status: CartStatus.ABANDONED,
    productCount: 2,
    hasDiscount: true,
    discountCode: 'FIRST5',
    daysAgo: 7,
    customerEmail: 'almost.bought@example.com',
    customerName: 'Almost Bought',
    utmSource: 'referral',
    utmMedium: 'friend',
  },

  // Completed/converted carts
  {
    status: CartStatus.CONVERTED,
    productCount: 2,
    hasDiscount: false,
    daysAgo: 1,
    customerEmail: 'happy.customer@example.com',
    customerName: 'Happy Customer',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'brand',
  },
  {
    status: CartStatus.CONVERTED,
    productCount: 3,
    hasDiscount: true,
    discountCode: 'SAVE10',
    daysAgo: 3,
    customerEmail: 'repeat.buyer@example.com',
    customerName: 'Repeat Buyer',
    utmSource: 'email',
    utmMedium: 'newsletter',
  },
  {
    status: CartStatus.CONVERTED,
    productCount: 1,
    hasDiscount: false,
    daysAgo: 7,
    customerEmail: 'gift.giver@example.com',
    customerName: 'Gift Giver',
    utmSource: 'direct',
  },

  // Expired cart
  {
    status: CartStatus.EXPIRED,
    productCount: 2,
    hasDiscount: false,
    daysAgo: 30,
    customerEmail: 'old.session@example.com',
    customerName: 'Old Session',
  },
];

export async function seedDemoCarts(prisma: PrismaClient) {
  console.log('🛒 Seeding demo carts...');

  // Find the Coffee Explorer company
  const company = await prisma.company.findFirst({
    where: { slug: 'ce-store' },
  });

  if (!company) {
    console.log('  ⚠ Coffee Explorer company not found, skipping cart seed');
    return { carts: [], discountCodes: DEMO_DISCOUNT_CODES };
  }

  // Get coffee products for the carts
  const products = await prisma.product.findMany({
    where: { companyId: company.id, status: 'ACTIVE', deletedAt: null },
    take: 10,
  });

  if (products.length === 0) {
    console.log('  ⚠ No products found, skipping cart seed');
    return { carts: [], discountCodes: DEMO_DISCOUNT_CODES };
  }

  // Find the Coffee funnel
  const funnel = await prisma.funnel.findFirst({
    where: { companyId: company.id, status: 'PUBLISHED' },
  });

  const createdCarts: Array<{ id: string; status: CartStatus }> = [];

  for (const config of DEMO_CART_CONFIGS) {
    const sessionToken = `demo_${nanoid(16)}`;
    const visitorId = `visitor_${nanoid(12)}`;
    const now = new Date();
    const createdAt = new Date(now.getTime() - config.daysAgo * 24 * 60 * 60 * 1000);

    // Randomly select products for this cart
    const cartProducts = shuffleArray([...products]).slice(0, config.productCount);

    // Calculate totals
    let subtotal = 0;
    const cartItems = cartProducts.map((product, index) => {
      const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      return {
        productId: product.id,
        productSnapshot: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: unitPrice,
          imageUrl: null,
        },
        quantity,
        unitPrice,
        originalPrice: unitPrice,
        discountAmount: 0,
        lineTotal,
        customFields: {},
        isGift: false,
        addedAt: new Date(createdAt.getTime() + index * 60000), // Stagger add times
      };
    });

    // Calculate discount
    let discountTotal = 0;
    const discountCodes: Array<{ code: string; type: string; value: number }> = [];
    if (config.hasDiscount && config.discountCode) {
      const discountConfig = DEMO_DISCOUNT_CODES.find((d) => d.code === config.discountCode);
      if (discountConfig) {
        discountCodes.push({
          code: discountConfig.code,
          type: discountConfig.type,
          value: discountConfig.value,
        });
        if (discountConfig.type === 'percentage') {
          discountTotal = subtotal * (discountConfig.value / 100);
        } else if (discountConfig.type === 'fixed') {
          discountTotal = Math.min(discountConfig.value, subtotal);
        }
      }
    }

    const shippingTotal = subtotal >= 35 ? 0 : 5.99;
    const taxRate = 0.08;
    const taxTotal = (subtotal - discountTotal) * taxRate;
    const grandTotal = subtotal - discountTotal + taxTotal + shippingTotal;

    // Set timestamps based on status
    let abandonedAt: Date | null = null;
    let convertedAt: Date | null = null;
    let expiresAt: Date | null = null;
    let lastActivityAt = createdAt;

    if (config.status === CartStatus.ABANDONED) {
      abandonedAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours after creation
      lastActivityAt = abandonedAt;
    } else if (config.status === CartStatus.CONVERTED) {
      convertedAt = new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 min after creation
      lastActivityAt = convertedAt;
    } else if (config.status === CartStatus.EXPIRED) {
      expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 1 day after creation
      lastActivityAt = expiresAt;
    } else {
      // Active cart - recent activity
      lastActivityAt = new Date(now.getTime() - Math.random() * 60 * 60 * 1000); // Within last hour
    }

    // Check for existing cart with same session token
    const existingCart = await prisma.cart.findUnique({
      where: { sessionToken },
    });

    if (existingCart) {
      continue; // Skip if already exists
    }

    // Create the cart
    const cart = await prisma.cart.create({
      data: {
        companyId: company.id,
        sessionToken,
        visitorId,
        status: config.status,
        currency: 'USD',
        subtotal,
        discountTotal,
        taxTotal,
        shippingTotal,
        grandTotal,
        itemCount: cartProducts.length,
        discountCodes: discountCodes,
        shippingCountry: 'US',
        shippingPostalCode: getRandomZip(),
        metadata: {
          isDemoCart: true,
          customerEmail: config.customerEmail,
          customerName: config.customerName,
          funnelId: funnel?.id,
          funnelName: funnel?.name,
        },
        utmSource: config.utmSource,
        utmMedium: config.utmMedium,
        utmCampaign: config.utmCampaign,
        recoveryEmailSent: config.status === CartStatus.ABANDONED && config.daysAgo > 1,
        recoveryEmailSentAt:
          config.status === CartStatus.ABANDONED && config.daysAgo > 1
            ? new Date(createdAt.getTime() + 4 * 60 * 60 * 1000)
            : null,
        recoveryClicks:
          config.status === CartStatus.ABANDONED && config.daysAgo > 1
            ? Math.floor(Math.random() * 3)
            : 0,
        createdAt,
        lastActivityAt,
        abandonedAt,
        convertedAt,
        expiresAt,
        items: {
          create: cartItems,
        },
      },
    });

    createdCarts.push({ id: cart.id, status: cart.status });

    // If cart has a customer email, try to link to existing customer or create lead
    if (config.customerEmail) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { companyId: company.id, email: config.customerEmail, deletedAt: null },
      });

      if (existingCustomer) {
        await prisma.cart.update({
          where: { id: cart.id },
          data: { customerId: existingCustomer.id },
        });
      }
    }
  }

  // Summary
  const statusCounts = createdCarts.reduce(
    (acc, cart) => {
      acc[cart.status] = (acc[cart.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(`  ✓ Created ${createdCarts.length} demo carts:`);
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`    - ${status}: ${count}`);
  });
  console.log(`  ✓ Demo discount codes: ${DEMO_DISCOUNT_CODES.map((d) => d.code).join(', ')}`);

  return { carts: createdCarts, discountCodes: DEMO_DISCOUNT_CODES };
}

/**
 * Reset all demo cart data
 * Useful for testing and development
 */
export async function resetDemoCartData(prisma: PrismaClient) {
  console.log('🗑️ Resetting demo cart data...');

  // Find demo carts by metadata flag
  const demoCarts = await prisma.cart.findMany({
    where: {
      OR: [
        { sessionToken: { startsWith: 'demo_' } },
        { metadata: { path: ['isDemoCart'], equals: true } },
      ],
    },
    select: { id: true },
  });

  if (demoCarts.length === 0) {
    console.log('  ⚠ No demo carts found to reset');
    return { deleted: 0 };
  }

  const cartIds = demoCarts.map((c) => c.id);

  // Delete cart items first (cascade should handle this, but being explicit)
  await prisma.cartItem.deleteMany({
    where: { cartId: { in: cartIds } },
  });

  // Delete saved cart items
  await prisma.savedCartItem.deleteMany({
    where: { cartId: { in: cartIds } },
  });

  // Delete the carts
  const deleted = await prisma.cart.deleteMany({
    where: { id: { in: cartIds } },
  });

  console.log(`  ✓ Deleted ${deleted.count} demo carts and their items`);

  return { deleted: deleted.count };
}

// Utility functions
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomZip(): string {
  const zips = ['98101', '10001', '90210', '60601', '02101', '30301', '75201', '33101', '85001', '19101'];
  return zips[Math.floor(Math.random() * zips.length)];
}

export default seedDemoCarts;
