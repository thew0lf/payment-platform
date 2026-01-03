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
  // CMO & Copywriter Approved - December 2025
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
            sections: [
              {
                id: 'hero',
                type: 'hero',
                config: {
                  headline: 'Quality You Can Feel. Prices You\'ll Love.',
                  subheadline: 'Handpicked products from brands you trust. Free shipping on orders over $50.',
                  ctaText: 'Browse Collection',
                  backgroundType: 'gradient',
                },
              },
              {
                id: 'benefits',
                type: 'features',
                config: {
                  sectionTitle: 'Why Shop With Us',
                  benefits: [
                    { title: 'Free Shipping', description: 'On all orders over $50. No surprises at checkout.', iconSuggestion: 'truck' },
                    { title: 'Easy Returns', description: '30-day hassle-free returns. No questions asked.', iconSuggestion: 'package' },
                    { title: 'Secure Checkout', description: 'Your payment info is always protected.', iconSuggestion: 'shield' },
                    { title: 'Fast Delivery', description: 'Most orders ship within 24 hours.', iconSuggestion: 'zap' },
                  ],
                },
              },
              {
                id: 'social',
                type: 'testimonials',
                config: {
                  sectionTitle: 'Loved by 50,000+ Happy Customers',
                  statsToHighlight: ['4.9/5 average rating', '50,000+ orders shipped'],
                  testimonialPrompts: [
                    'Fast shipping and exactly as described. Will definitely order again!',
                    'Great quality for the price. My new favorite store.',
                  ],
                },
              },
              {
                id: 'cta',
                type: 'cta',
                config: {
                  headline: 'Ready to Find Something You\'ll Love?',
                  subheadline: 'Join thousands of happy customers who shop with confidence.',
                  buttonText: 'Start Shopping',
                },
              },
            ],
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
            trust: {
              showSecurityBadges: true,
              showGuarantee: true,
              guaranteeText: 'Not happy? Return within 30 days for a full refund.',
            },
          },
        },
        {
          name: 'Thank You',
          type: 'THANK_YOU',
          order: 3,
          config: {
            headline: 'You\'ve got great taste! 🎉',
            message: 'Your order is confirmed and on its way. Check your email for tracking details.',
            nextSteps: [
              'Confirmation email sent to your inbox',
              'We\'ll notify you when it ships',
              'Track your order anytime',
            ],
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
            sections: [
              {
                id: 'hero',
                type: 'hero',
                config: {
                  headline: 'Work Smarter, Not Harder',
                  subheadline: 'Join 10,000+ teams who save 10+ hours every week. Try it free for 14 days—no credit card needed.',
                  ctaText: 'Start My Free Trial',
                  backgroundType: 'gradient',
                },
              },
              {
                id: 'benefits',
                type: 'features',
                config: {
                  sectionTitle: 'Everything You Need to Succeed',
                  benefits: [
                    { title: 'Lightning Fast Setup', description: 'Get started in under 5 minutes. No technical skills required.', iconSuggestion: 'zap' },
                    { title: 'Powerful Automation', description: 'Automate repetitive tasks and focus on what matters.', iconSuggestion: 'sparkles' },
                    { title: 'Real-Time Analytics', description: 'Make data-driven decisions with live dashboards.', iconSuggestion: 'chart' },
                    { title: 'World-Class Support', description: 'Our team is here 24/7 to help you succeed.', iconSuggestion: 'users' },
                  ],
                },
              },
              {
                id: 'social',
                type: 'testimonials',
                config: {
                  sectionTitle: 'Trusted by Teams at Companies You Know',
                  statsToHighlight: ['10,000+ active teams', '4.8/5 on G2 and Capterra', '99.9% uptime'],
                  testimonialPrompts: [
                    'This tool paid for itself in the first week. Game changer for our team.',
                    'Finally, software that just works. Our productivity has doubled.',
                  ],
                },
              },
              {
                id: 'cta',
                type: 'cta',
                config: {
                  headline: 'Ready to Transform Your Workflow?',
                  subheadline: '14 days free. No credit card. Cancel anytime.',
                  buttonText: 'Start My Free Trial',
                  urgencyText: 'Takes just 2 minutes to set up',
                },
              },
            ],
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
            headline: 'Welcome to the team! 🚀',
            message: 'Your trial is active and ready to go. Check your inbox for next steps.',
            nextSteps: [
              'Login link sent to your email',
              'Quick start guide included',
              'Schedule a free onboarding call',
            ],
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
            sections: [
              {
                id: 'hero',
                type: 'hero',
                config: {
                  headline: 'Finally Master the Skills That Actually Matter',
                  subheadline: 'Join 10,000+ students who\'ve transformed their careers. Get lifetime access, hands-on projects, and a supportive community.',
                  ctaText: 'Enroll Now',
                  backgroundType: 'gradient',
                },
              },
              {
                id: 'benefits',
                type: 'features',
                config: {
                  sectionTitle: 'What You\'ll Get',
                  benefits: [
                    { title: 'Lifetime Access', description: 'Learn at your own pace. Access content forever, including all future updates.', iconSuggestion: 'clock' },
                    { title: 'Hands-On Projects', description: 'Build real-world projects you can add to your portfolio.', iconSuggestion: 'box' },
                    { title: 'Expert Instruction', description: 'Learn from industry professionals with years of experience.', iconSuggestion: 'award' },
                    { title: 'Community Support', description: 'Join a private community of students and mentors.', iconSuggestion: 'users' },
                  ],
                },
              },
              {
                id: 'social',
                type: 'testimonials',
                config: {
                  sectionTitle: 'What Our Students Say',
                  statsToHighlight: ['10,000+ students enrolled', '4.9/5 average rating', '97% completion rate'],
                  testimonials: [
                    { name: 'John D.', text: 'This course changed my career trajectory. I landed my dream job within 3 months of completing it.', rating: 5, role: 'Software Engineer' },
                    { name: 'Sarah M.', text: 'Best investment I\'ve made in myself. The hands-on projects were exactly what I needed.', rating: 5, role: 'Product Manager' },
                  ],
                },
              },
              {
                id: 'faq',
                type: 'faq',
                config: {
                  sectionTitle: 'Frequently Asked Questions',
                  items: [
                    { question: 'How long do I have access to the course?', answer: 'Forever! Once you enroll, you get lifetime access to all course materials, including future updates.' },
                    { question: 'What if I\'m not satisfied?', answer: 'We offer a 30-day money-back guarantee. If you\'re not happy, just let us know and we\'ll refund you in full.' },
                    { question: 'Do I need any prior experience?', answer: 'No prior experience required. This course is designed to take you from beginner to proficient.' },
                  ],
                },
              },
              {
                id: 'cta',
                type: 'cta',
                config: {
                  headline: 'Ready to Transform Your Career?',
                  subheadline: 'Join thousands of students who\'ve already made the leap.',
                  buttonText: 'Enroll Now',
                  urgencyText: 'Enrollment closes soon',
                },
              },
            ],
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
              guaranteeText: '30-day money-back guarantee. No questions asked.',
            },
          },
        },
        {
          name: 'Welcome',
          type: 'THANK_YOU',
          order: 2,
          config: {
            headline: 'Welcome to the course! 🎓',
            message: 'You\'re officially enrolled. Check your inbox for login details and your first lesson.',
            nextSteps: [
              'Login link sent to your email',
              'Start with Lesson 1 today',
              'Join the student community',
            ],
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
            sections: [
              {
                id: 'hero',
                type: 'hero',
                config: {
                  headline: 'Your Gift Changes Lives',
                  subheadline: 'Every dollar you give directly supports our mission. Together, we\'re making a real difference in our community.',
                  ctaText: 'Give Today',
                  backgroundType: 'gradient',
                },
              },
              {
                id: 'benefits',
                type: 'features',
                config: {
                  sectionTitle: 'Your Impact',
                  benefits: [
                    { title: '$25 Provides', description: 'School supplies for one child for an entire semester.', iconSuggestion: 'heart' },
                    { title: '$50 Provides', description: 'A week of meals for a family in need.', iconSuggestion: 'heart' },
                    { title: '$100 Provides', description: 'Medical care for three people without access.', iconSuggestion: 'heart' },
                    { title: '$250 Provides', description: 'Job training and placement for one person.', iconSuggestion: 'heart' },
                  ],
                },
              },
              {
                id: 'social',
                type: 'testimonials',
                config: {
                  sectionTitle: 'Trusted by Our Community',
                  statsToHighlight: ['10,000+ donors', '$2M+ raised', '50+ lives changed every day'],
                  testimonialPrompts: [
                    'Knowing my donation directly helps families in my community means everything.',
                    'I\'ve been donating for 5 years and have seen the real impact firsthand.',
                  ],
                },
              },
              {
                id: 'cta',
                type: 'cta',
                config: {
                  headline: 'Ready to Make a Difference?',
                  subheadline: 'Your generosity creates lasting change. Every gift matters.',
                  buttonText: 'Donate Now',
                },
              },
            ],
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
            headline: 'Thank you for your generosity! 💚',
            message: 'Your donation is already making a difference. A tax-deductible receipt has been sent to your email.',
            nextSteps: [
              'Receipt sent to your email',
              'Share your gift on social media',
              'Sign up for our impact newsletter',
            ],
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
            sections: [
              {
                id: 'hero',
                type: 'hero',
                config: {
                  headline: 'The Event You Don\'t Want to Miss',
                  subheadline: 'Join industry leaders, connect with peers, and gain insights that will transform your approach. Limited seats available.',
                  ctaText: 'Get My Ticket',
                  backgroundType: 'gradient',
                },
              },
              {
                id: 'benefits',
                type: 'features',
                config: {
                  sectionTitle: 'What to Expect',
                  benefits: [
                    { title: 'Expert Speakers', description: 'Learn from the best in the industry with actionable insights.', iconSuggestion: 'award' },
                    { title: 'Networking', description: 'Connect with like-minded professionals and expand your network.', iconSuggestion: 'users' },
                    { title: 'Workshops', description: 'Hands-on sessions to apply what you learn immediately.', iconSuggestion: 'zap' },
                    { title: 'Premium Perks', description: 'Catered lunch, swag bag, and exclusive after-party access.', iconSuggestion: 'star' },
                  ],
                },
              },
              {
                id: 'social',
                type: 'testimonials',
                config: {
                  sectionTitle: 'Past Attendees Loved It',
                  statsToHighlight: ['1,000+ attendees last year', '4.9/5 event rating', '95% would recommend'],
                  testimonialPrompts: [
                    'The networking alone was worth the ticket price. Made connections that changed my career.',
                    'Best conference I\'ve attended. Leaving with actionable strategies I can use immediately.',
                  ],
                },
              },
              {
                id: 'cta',
                type: 'cta',
                config: {
                  headline: 'Secure Your Spot Today',
                  subheadline: 'Early bird pricing ends soon. Don\'t miss out.',
                  buttonText: 'Get My Ticket',
                  urgencyText: 'Only 50 early bird tickets left',
                },
              },
            ],
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
            headline: 'You\'re registered! 🎟️',
            message: 'Your tickets are confirmed. Check your email for your QR code and event details.',
            nextSteps: [
              'Tickets sent to your email',
              'Add event to your calendar',
              'Join the attendee community',
            ],
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
  // CMO & Copywriter Approved - December 2025
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
        sections: [
          {
            id: 'hero',
            type: 'hero',
            config: {
              headline: 'The Solution You\'ve Been Looking For',
              subheadline: 'Join thousands who\'ve already made the switch. Experience the difference today.',
              ctaText: 'Get Started Now',
              backgroundType: 'gradient',
            },
          },
          {
            id: 'cta',
            type: 'cta',
            config: {
              headline: 'Ready to Get Started?',
              subheadline: 'No credit card required. Start free today.',
              buttonText: 'Start Free',
            },
          },
        ],
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
        sections: [
          {
            id: 'hero',
            type: 'hero',
            config: {
              headline: 'See It In Action',
              subheadline: 'Watch how our product can transform your workflow in just 2 minutes.',
              ctaText: 'Watch Demo',
              backgroundType: 'gradient',
            },
          },
          {
            id: 'cta',
            type: 'cta',
            config: {
              headline: 'Ready to Experience It Yourself?',
              subheadline: 'Try it free for 14 days. No commitment.',
              buttonText: 'Start My Free Trial',
            },
          },
        ],
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
