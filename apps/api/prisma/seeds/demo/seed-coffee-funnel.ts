/**
 * Demo: Coffee Explorer Funnel Seed
 * Creates a demo funnel for the Coffee Explorer company
 */

import { PrismaClient, FunnelType, FunnelStatus, StageType } from '@prisma/client';
import { nanoid } from 'nanoid';

export async function seedCoffeeFunnel(prisma: PrismaClient) {
  console.log('🚀 Seeding Coffee Explorer funnel...');

  // Find the Coffee Explorer company
  const company = await prisma.company.findFirst({
    where: { slug: 'ce-store' },
  });

  if (!company) {
    console.log('  ⚠ Coffee Explorer company not found, skipping funnel seed');
    return null;
  }

  // Get some products for the funnel
  const products = await prisma.product.findMany({
    where: { companyId: company.id, status: 'ACTIVE' },
    take: 6,
    select: { id: true },
  });

  if (products.length === 0) {
    console.log('  ⚠ No products found, skipping funnel seed');
    return null;
  }

  const funnelSlug = 'coffee-lovers';
  const shortId = nanoid(6);

  // Create or update the funnel
  const funnel = await prisma.funnel.upsert({
    where: {
      companyId_slug: { companyId: company.id, slug: funnelSlug },
    },
    update: {},
    create: {
      company: { connect: { id: company.id } },
      createdBy: 'system',
      name: 'Coffee Lovers Collection',
      slug: funnelSlug,
      shortId,
      description: 'Discover our premium coffee collection and start your journey to better coffee.',
      type: FunnelType.FULL_FUNNEL,
      status: FunnelStatus.PUBLISHED,
      publishedAt: new Date(),
      settings: {
        branding: {
          primaryColor: '#92400e', // Amber-800 - coffee brown
          secondaryColor: '#78350f', // Amber-900
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        urls: {
          successUrl: null,
          cancelUrl: null,
          termsUrl: '/terms',
          privacyUrl: '/privacy',
        },
        behavior: {
          allowBackNavigation: true,
          showProgressBar: true,
          autoSaveProgress: true,
          sessionTimeout: 60,
          abandonmentEmail: false,
        },
        seo: {
          title: 'Premium Coffee Collection | Coffee Explorer',
          description: 'Discover artisanal coffee from around the world. Freshly roasted and delivered to your door.',
          ogImage: null,
        },
        ai: {
          insightsEnabled: false,
          insightTiming: 'daily_digest',
          actionMode: 'guided_wizard',
        },
      },
      totalVisits: 0,
      totalConversions: 0,
    },
  });

  console.log(`  ✓ Funnel: ${funnel.name} (/${funnelSlug}-${shortId})`);

  // Create stages
  const stages = [
    {
      name: 'Welcome',
      type: StageType.LANDING,
      order: 0,
      config: {
        layout: 'hero-cta',
        sections: [
          {
            id: 'hero-1',
            type: 'hero',
            config: {
              headline: 'Exceptional Coffee, Delivered Fresh',
              subheadline: 'Experience the world\'s finest single-origin coffees, roasted to perfection and shipped directly to you.',
            },
          },
          {
            id: 'features-1',
            type: 'features',
            config: {
              title: 'Why Coffee Explorer?',
              features: [
                {
                  icon: '☕',
                  title: 'Single-Origin Excellence',
                  description: 'Each bag comes from a single farm or region, ensuring unique flavor profiles.',
                },
                {
                  icon: '🌱',
                  title: 'Ethically Sourced',
                  description: 'Direct trade relationships with farmers who care about quality and sustainability.',
                },
                {
                  icon: '📦',
                  title: 'Roasted to Order',
                  description: 'Your coffee is roasted within 24 hours of your order for maximum freshness.',
                },
                {
                  icon: '🚚',
                  title: 'Free Shipping',
                  description: 'Free shipping on all orders over $35. Most orders arrive in 2-3 days.',
                },
              ],
            },
          },
          {
            id: 'testimonials-1',
            type: 'testimonials',
            config: {
              title: 'What Coffee Lovers Say',
              testimonials: [
                {
                  name: 'Michael T.',
                  text: 'The Ethiopian Yirgacheffe is absolutely incredible. Bright, fruity, and unlike anything from the grocery store.',
                  rating: 5,
                },
                {
                  name: 'Sarah K.',
                  text: 'I\'ve tried many subscription services, but Coffee Explorer is by far the best. Fresh roasts every time!',
                  rating: 5,
                },
                {
                  name: 'James R.',
                  text: 'The variety is amazing. Every month I discover a new favorite origin. Highly recommend!',
                  rating: 5,
                },
              ],
            },
          },
          {
            id: 'cta-1',
            type: 'cta',
            config: {
              headline: 'Ready to Elevate Your Coffee Experience?',
              subheadline: 'Choose from our curated selection of premium coffees.',
              benefits: [
                'Free shipping on orders over $35',
                'Freshly roasted to order',
                '100% satisfaction guarantee',
              ],
            },
          },
        ],
        cta: {
          text: 'Explore Our Collection',
          style: 'gradient',
        },
      },
    },
    {
      name: 'Choose Your Coffee',
      type: StageType.PRODUCT_SELECTION,
      order: 1,
      config: {
        layout: 'grid',
        source: {
          type: 'manual',
          productIds: products.map((p) => p.id),
        },
        display: {
          showPrices: true,
          showDescription: true,
          showVariants: false,
          showQuantity: true,
          showFilters: false,
          showSearch: true,
          itemsPerPage: 12,
        },
        selection: {
          mode: 'multiple',
          minItems: 1,
          maxItems: 10,
          allowQuantity: true,
        },
        cta: {
          text: 'Continue to Checkout',
          position: 'fixed-bottom',
        },
      },
    },
    {
      name: 'Checkout',
      type: StageType.CHECKOUT,
      order: 2,
      config: {
        layout: 'two-column',
        fields: {
          customer: {
            email: { enabled: true, required: true },
            firstName: { enabled: true, required: true },
            lastName: { enabled: true, required: true },
            phone: { enabled: true, required: false },
            company: { enabled: false, required: false },
          },
          shipping: {
            enabled: true,
            required: true,
          },
          billing: {
            enabled: true,
            sameAsShipping: true,
          },
          custom: [],
        },
        payment: {
          methods: [
            { type: 'card', enabled: true, label: 'Credit Card' },
          ],
          showOrderSummary: true,
          allowCoupons: true,
          allowGiftCards: false,
          showTaxEstimate: true,
          showShippingEstimate: true,
        },
        trust: {
          showSecurityBadges: true,
          showGuarantee: true,
          showTestimonial: false,
          guaranteeText: '30-day money-back guarantee. If you\'re not completely satisfied, we\'ll refund your order.',
        },
      },
    },
  ];

  // Delete existing stages and create new ones
  await prisma.funnelStage.deleteMany({
    where: { funnelId: funnel.id },
  });

  for (const stage of stages) {
    await prisma.funnelStage.create({
      data: {
        funnelId: funnel.id,
        name: stage.name,
        type: stage.type,
        order: stage.order,
        config: stage.config as any,
      },
    });
    console.log(`  ✓ Stage: ${stage.name} (${stage.type})`);
  }

  console.log(`  ✓ Funnel URL: /f/${funnelSlug}-${shortId}`);

  return funnel;
}

export default seedCoffeeFunnel;
