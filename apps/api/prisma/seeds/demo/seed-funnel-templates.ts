import { PrismaClient, FunnelTemplateType } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateData {
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  templateType: FunnelTemplateType;
  category: string;
  featured: boolean;
  industry: string[];
  tags: string[];
  config: object;
}

const templates: TemplateData[] = [
  // ═══════════════════════════════════════════════════════════════
  // FULL FUNNEL TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'E-commerce Starter',
    slug: 'ecommerce-starter',
    description: 'Complete e-commerce funnel with landing page, product selection, and checkout. Perfect for online stores.',
    thumbnail: '/templates/ecommerce-starter.png',
    templateType: 'FULL_FUNNEL',
    category: 'ecommerce',
    featured: true,
    industry: ['retail', 'fashion', 'electronics'],
    tags: ['starter', 'products', 'popular'],
    config: {
      type: 'FULL_FUNNEL',
      stages: [
        {
          name: 'Landing',
          type: 'LANDING',
          order: 0,
          config: {
            layout: 'hero-cta',
            headline: 'Discover Our Collection',
            subheadline: 'Premium products at unbeatable prices',
            ctaText: 'Shop Now',
          },
        },
        {
          name: 'Products',
          type: 'PRODUCT_SELECTION',
          order: 1,
          config: {
            layout: 'grid',
            display: { showPrices: true, showDescription: true, showVariants: true },
            selection: { mode: 'multiple', allowQuantity: true },
          },
        },
        {
          name: 'Checkout',
          type: 'CHECKOUT',
          order: 2,
          config: {
            layout: 'two-column',
            fields: {
              customer: {
                email: { enabled: true, required: true },
                firstName: { enabled: true, required: true },
                lastName: { enabled: true, required: true },
                phone: { enabled: true, required: false },
              },
              shipping: { enabled: true, required: true },
            },
            payment: {
              methods: [{ type: 'card', enabled: true }],
              showOrderSummary: true,
              allowCoupons: true,
            },
          },
        },
        {
          name: 'Thank You',
          type: 'THANK_YOU',
          order: 3,
          config: {
            headline: 'Thank you for your order!',
            message: 'Your order has been confirmed. Check your email for details.',
          },
        },
      ],
      settings: {
        branding: {
          primaryColor: '#4F46E5',
        },
      },
    },
  },
  {
    name: 'SaaS Trial',
    slug: 'saas-trial',
    description: 'Convert visitors to trial users with a compelling landing page and streamlined checkout.',
    thumbnail: '/templates/saas-trial.png',
    templateType: 'FULL_FUNNEL',
    category: 'saas',
    featured: true,
    industry: ['software', 'tech', 'b2b'],
    tags: ['saas', 'trial', 'subscription'],
    config: {
      type: 'LANDING_CHECKOUT',
      stages: [
        {
          name: 'Landing',
          type: 'LANDING',
          order: 0,
          config: {
            layout: 'feature-grid',
            headline: 'Start Your Free Trial',
            subheadline: '14 days free. No credit card required.',
            features: [
              { title: 'Feature 1', description: 'Description of feature 1' },
              { title: 'Feature 2', description: 'Description of feature 2' },
              { title: 'Feature 3', description: 'Description of feature 3' },
            ],
            ctaText: 'Start Free Trial',
          },
        },
        {
          name: 'Checkout',
          type: 'CHECKOUT',
          order: 1,
          config: {
            layout: 'single-page',
            fields: {
              customer: {
                email: { enabled: true, required: true },
                firstName: { enabled: true, required: true },
                lastName: { enabled: true, required: true },
                company: { enabled: true, required: false },
              },
              shipping: { enabled: false, required: false },
            },
            payment: {
              methods: [{ type: 'card', enabled: true }],
              showOrderSummary: true,
            },
            trust: {
              showSecurityBadges: true,
              showGuarantee: true,
              guaranteeText: 'Cancel anytime. No questions asked.',
            },
          },
        },
        {
          name: 'Welcome',
          type: 'THANK_YOU',
          order: 2,
          config: {
            headline: 'Welcome aboard!',
            message: 'Your trial has started. Check your email for login details.',
          },
        },
      ],
      settings: {
        branding: {
          primaryColor: '#0EA5E9',
        },
      },
    },
  },
  {
    name: 'Course Launch',
    slug: 'course-launch',
    description: 'Sell digital courses with a high-converting landing page and simple checkout.',
    thumbnail: '/templates/course-launch.png',
    templateType: 'FULL_FUNNEL',
    category: 'digital',
    featured: true,
    industry: ['education', 'coaching', 'digital-products'],
    tags: ['course', 'digital', 'education'],
    config: {
      type: 'LANDING_CHECKOUT',
      stages: [
        {
          name: 'Sales Page',
          type: 'LANDING',
          order: 0,
          config: {
            layout: 'video-hero',
            headline: 'Master [Skill] in 30 Days',
            subheadline: 'Join 10,000+ students who have transformed their careers',
            videoUrl: '',
            testimonials: [
              { name: 'John D.', text: 'This course changed my life!', rating: 5 },
              { name: 'Sarah M.', text: 'Best investment I ever made.', rating: 5 },
            ],
            ctaText: 'Enroll Now',
          },
        },
        {
          name: 'Checkout',
          type: 'CHECKOUT',
          order: 1,
          config: {
            layout: 'two-column',
            fields: {
              customer: {
                email: { enabled: true, required: true },
                firstName: { enabled: true, required: true },
                lastName: { enabled: true, required: true },
              },
              shipping: { enabled: false, required: false },
            },
            payment: {
              methods: [
                { type: 'card', enabled: true },
                { type: 'paypal', enabled: true },
              ],
              showOrderSummary: true,
              allowCoupons: true,
            },
            trust: {
              showSecurityBadges: true,
              showGuarantee: true,
              guaranteeText: '30-day money-back guarantee',
            },
          },
        },
        {
          name: 'Welcome',
          type: 'THANK_YOU',
          order: 2,
          config: {
            headline: 'You\'re in!',
            message: 'Check your email for instant access to the course.',
          },
        },
      ],
      settings: {
        branding: {
          primaryColor: '#8B5CF6',
        },
      },
    },
  },
  {
    name: 'Donation',
    slug: 'donation',
    description: 'Accept donations with a heartfelt landing page and flexible payment options.',
    thumbnail: '/templates/donation.png',
    templateType: 'FULL_FUNNEL',
    category: 'nonprofit',
    featured: false,
    industry: ['nonprofit', 'charity', 'fundraising'],
    tags: ['donation', 'nonprofit', 'charity'],
    config: {
      type: 'LANDING_CHECKOUT',
      stages: [
        {
          name: 'Cause',
          type: 'LANDING',
          order: 0,
          config: {
            layout: 'hero-cta',
            headline: 'Make a Difference Today',
            subheadline: 'Your donation helps us continue our mission',
            ctaText: 'Donate Now',
          },
        },
        {
          name: 'Donate',
          type: 'CHECKOUT',
          order: 1,
          config: {
            layout: 'single-page',
            fields: {
              customer: {
                email: { enabled: true, required: true },
                firstName: { enabled: true, required: true },
                lastName: { enabled: true, required: true },
              },
              shipping: { enabled: false, required: false },
            },
            payment: {
              methods: [
                { type: 'card', enabled: true },
                { type: 'paypal', enabled: true },
              ],
              showOrderSummary: false,
            },
            trust: {
              showSecurityBadges: true,
              showGuarantee: false,
            },
          },
        },
        {
          name: 'Thank You',
          type: 'THANK_YOU',
          order: 2,
          config: {
            headline: 'Thank You for Your Generosity!',
            message: 'Your donation makes a real difference. A receipt has been sent to your email.',
          },
        },
      ],
      settings: {
        branding: {
          primaryColor: '#10B981',
        },
      },
    },
  },
  {
    name: 'Event Registration',
    slug: 'event-registration',
    description: 'Sell event tickets with attendee information collection and payment.',
    thumbnail: '/templates/event-registration.png',
    templateType: 'FULL_FUNNEL',
    category: 'events',
    featured: false,
    industry: ['events', 'conferences', 'workshops'],
    tags: ['event', 'tickets', 'registration'],
    config: {
      type: 'FULL_FUNNEL',
      stages: [
        {
          name: 'Event Details',
          type: 'LANDING',
          order: 0,
          config: {
            layout: 'hero-cta',
            headline: '[Event Name] 2025',
            subheadline: 'Join us for an unforgettable experience',
            ctaText: 'Get Tickets',
          },
        },
        {
          name: 'Select Tickets',
          type: 'PRODUCT_SELECTION',
          order: 1,
          config: {
            layout: 'comparison',
            display: { showPrices: true, showDescription: true },
            selection: { mode: 'single' },
          },
        },
        {
          name: 'Checkout',
          type: 'CHECKOUT',
          order: 2,
          config: {
            layout: 'two-column',
            fields: {
              customer: {
                email: { enabled: true, required: true },
                firstName: { enabled: true, required: true },
                lastName: { enabled: true, required: true },
                phone: { enabled: true, required: true },
              },
              shipping: { enabled: false, required: false },
              custom: [
                { id: 'dietary', type: 'select', label: 'Dietary Requirements', required: false },
              ],
            },
            payment: {
              methods: [{ type: 'card', enabled: true }],
              showOrderSummary: true,
            },
          },
        },
        {
          name: 'Confirmation',
          type: 'THANK_YOU',
          order: 3,
          config: {
            headline: 'You\'re Registered!',
            message: 'Your tickets have been sent to your email. See you there!',
          },
        },
      ],
      settings: {
        branding: {
          primaryColor: '#F59E0B',
        },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT TEMPLATES (Single Stage)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Hero Landing',
    slug: 'hero-landing',
    description: 'Bold hero section with compelling CTA. Great for product launches.',
    thumbnail: '/templates/hero-landing.png',
    templateType: 'COMPONENT',
    category: 'landing',
    featured: false,
    industry: [],
    tags: ['hero', 'landing', 'cta'],
    config: {
      type: 'LANDING',
      config: {
        layout: 'hero-cta',
        headline: 'Your Headline Here',
        subheadline: 'A compelling subheadline that explains your value proposition',
        ctaText: 'Get Started',
        backgroundImage: '',
      },
    },
  },
  {
    name: 'Video Hero',
    slug: 'video-hero',
    description: 'Video-focused landing page. Perfect for courses and demos.',
    thumbnail: '/templates/video-hero.png',
    templateType: 'COMPONENT',
    category: 'landing',
    featured: false,
    industry: [],
    tags: ['video', 'landing', 'demo'],
    config: {
      type: 'LANDING',
      config: {
        layout: 'video-hero',
        headline: 'Watch How It Works',
        subheadline: 'See our product in action',
        videoUrl: '',
        ctaText: 'Try It Free',
      },
    },
  },
  {
    name: 'Product Grid',
    slug: 'product-grid',
    description: 'Clean product grid with filtering. Best for multiple products.',
    thumbnail: '/templates/product-grid.png',
    templateType: 'COMPONENT',
    category: 'products',
    featured: false,
    industry: [],
    tags: ['products', 'grid', 'catalog'],
    config: {
      type: 'PRODUCT_SELECTION',
      config: {
        layout: 'grid',
        display: {
          showPrices: true,
          showDescription: true,
          showVariants: true,
          showQuantity: true,
          showFilters: true,
        },
        selection: {
          mode: 'multiple',
          allowQuantity: true,
        },
      },
    },
  },
  {
    name: 'Pricing Comparison',
    slug: 'pricing-comparison',
    description: 'Side-by-side pricing table. Ideal for SaaS plans.',
    thumbnail: '/templates/pricing-comparison.png',
    templateType: 'COMPONENT',
    category: 'products',
    featured: false,
    industry: [],
    tags: ['pricing', 'comparison', 'saas'],
    config: {
      type: 'PRODUCT_SELECTION',
      config: {
        layout: 'comparison',
        display: {
          showPrices: true,
          showDescription: true,
        },
        selection: {
          mode: 'single',
        },
      },
    },
  },
  {
    name: 'Simple Checkout',
    slug: 'simple-checkout',
    description: 'Clean single-page checkout. Fast and conversion-focused.',
    thumbnail: '/templates/simple-checkout.png',
    templateType: 'COMPONENT',
    category: 'checkout',
    featured: false,
    industry: [],
    tags: ['checkout', 'simple', 'fast'],
    config: {
      type: 'CHECKOUT',
      config: {
        layout: 'single-page',
        fields: {
          customer: {
            email: { enabled: true, required: true },
            firstName: { enabled: true, required: true },
            lastName: { enabled: true, required: true },
          },
          shipping: { enabled: false },
        },
        payment: {
          methods: [{ type: 'card', enabled: true }],
          showOrderSummary: true,
        },
      },
    },
  },
  {
    name: 'Two-Column Checkout',
    slug: 'two-column-checkout',
    description: 'Professional two-column layout with order summary.',
    thumbnail: '/templates/two-column-checkout.png',
    templateType: 'COMPONENT',
    category: 'checkout',
    featured: false,
    industry: [],
    tags: ['checkout', 'professional', 'summary'],
    config: {
      type: 'CHECKOUT',
      config: {
        layout: 'two-column',
        fields: {
          customer: {
            email: { enabled: true, required: true },
            firstName: { enabled: true, required: true },
            lastName: { enabled: true, required: true },
            phone: { enabled: true, required: false },
          },
          shipping: { enabled: true, required: true },
          billing: { enabled: true, sameAsShipping: true },
        },
        payment: {
          methods: [{ type: 'card', enabled: true }],
          showOrderSummary: true,
          allowCoupons: true,
          showTaxEstimate: true,
          showShippingEstimate: true,
        },
        trust: {
          showSecurityBadges: true,
          showGuarantee: true,
        },
      },
    },
  },
];

export async function seedFunnelTemplates() {
  console.log('Seeding funnel templates...');

  for (const template of templates) {
    await prisma.funnelTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        thumbnail: template.thumbnail,
        templateType: template.templateType,
        category: template.category,
        featured: template.featured,
        industry: template.industry,
        tags: template.tags,
        config: template.config,
      },
      create: {
        name: template.name,
        slug: template.slug,
        description: template.description,
        thumbnail: template.thumbnail,
        templateType: template.templateType,
        category: template.category,
        featured: template.featured,
        industry: template.industry,
        tags: template.tags,
        config: template.config,
      },
    });
    console.log(`  Created/updated template: ${template.name}`);
  }

  console.log(`Seeded ${templates.length} funnel templates`);
}

// Run directly if called
if (require.main === module) {
  seedFunnelTemplates()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
