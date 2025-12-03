import { PrismaClient, CheckoutPageThemeCategory, PaymentPageType, PaymentPageStatus, PaymentSessionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// DEFAULT LAYOUT & COMPONENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const DEFAULT_LAYOUT = {
  type: 'single-column',
  headerPosition: 'top',
  sidebarEnabled: false,
  footerEnabled: true,
};

const DEFAULT_COMPONENTS = {
  button: {
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
  },
  input: {
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
  },
  card: {
    borderRadius: '12px',
    padding: '24px',
  },
};

// ═══════════════════════════════════════════════════════════════
// SYSTEM THEMES - 8 Pre-built themes for checkout pages
// ═══════════════════════════════════════════════════════════════

const SYSTEM_THEMES = [
  {
    name: 'Minimal',
    category: CheckoutPageThemeCategory.MINIMAL,
    isSystem: true,
    styles: {
      primaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      accentColor: '#10B981',
      textColor: '#1F2937',
      borderRadius: '4px',
      fontFamily: 'Inter, system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'outline',
      cardShadow: 'none',
      spacing: 'comfortable',
    },
    layout: DEFAULT_LAYOUT,
    components: DEFAULT_COMPONENTS,
  },
  {
    name: 'Modern',
    category: CheckoutPageThemeCategory.MODERN,
    isSystem: true,
    styles: {
      primaryColor: '#3B82F6',
      backgroundColor: '#F9FAFB',
      accentColor: '#22C55E',
      textColor: '#111827',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'filled',
      cardShadow: 'md',
      spacing: 'comfortable',
    },
    layout: DEFAULT_LAYOUT,
    components: DEFAULT_COMPONENTS,
  },
  {
    name: 'Enterprise',
    category: CheckoutPageThemeCategory.ENTERPRISE,
    isSystem: true,
    styles: {
      primaryColor: '#1E40AF',
      backgroundColor: '#FFFFFF',
      accentColor: '#059669',
      textColor: '#1F2937',
      borderRadius: '8px',
      fontFamily: 'Inter, system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'outline',
      cardShadow: 'sm',
      spacing: 'professional',
    },
    layout: { ...DEFAULT_LAYOUT, sidebarEnabled: true },
    components: DEFAULT_COMPONENTS,
  },
  {
    name: 'Luxury',
    category: CheckoutPageThemeCategory.LUXURY,
    isSystem: true,
    styles: {
      primaryColor: '#B8860B',
      backgroundColor: '#1A1A2E',
      accentColor: '#FFD700',
      textColor: '#F5F5F5',
      borderRadius: '0px',
      fontFamily: 'Playfair Display, Georgia, serif',
      buttonStyle: 'outline',
      inputStyle: 'underline',
      cardShadow: 'xl',
      spacing: 'luxurious',
    },
    layout: DEFAULT_LAYOUT,
    components: {
      ...DEFAULT_COMPONENTS,
      button: {
        borderRadius: '0px',
        padding: '16px 32px',
        fontSize: '14px',
        fontWeight: '400',
        textTransform: 'uppercase',
        letterSpacing: '2px',
      },
    },
  },
  {
    name: 'Friendly',
    category: CheckoutPageThemeCategory.FRIENDLY,
    isSystem: true,
    styles: {
      primaryColor: '#8B5CF6',
      backgroundColor: '#FEF3C7',
      accentColor: '#F59E0B',
      textColor: '#1F2937',
      borderRadius: '16px',
      fontFamily: 'Nunito, system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'filled',
      cardShadow: 'lg',
      spacing: 'playful',
    },
    layout: DEFAULT_LAYOUT,
    components: {
      ...DEFAULT_COMPONENTS,
      button: {
        borderRadius: '24px',
        padding: '14px 28px',
        fontSize: '16px',
        fontWeight: '600',
      },
    },
  },
  {
    name: 'Dark',
    category: CheckoutPageThemeCategory.DARK,
    isSystem: true,
    styles: {
      primaryColor: '#6366F1',
      backgroundColor: '#0F172A',
      accentColor: '#22D3EE',
      textColor: '#F1F5F9',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'outline',
      cardShadow: 'none',
      spacing: 'comfortable',
    },
    layout: DEFAULT_LAYOUT,
    components: DEFAULT_COMPONENTS,
  },
  {
    name: 'Speed',
    category: CheckoutPageThemeCategory.SPEED,
    isSystem: true,
    styles: {
      primaryColor: '#EF4444',
      backgroundColor: '#FFFFFF',
      accentColor: '#22C55E',
      textColor: '#111827',
      borderRadius: '8px',
      fontFamily: 'system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'outline',
      cardShadow: 'sm',
      spacing: 'compact',
      showProgressBar: true,
      singleColumn: true,
    },
    layout: { ...DEFAULT_LAYOUT, type: 'single-column-compact' },
    components: {
      ...DEFAULT_COMPONENTS,
      button: {
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
      },
    },
  },
  {
    name: 'Trust',
    category: CheckoutPageThemeCategory.TRUST,
    isSystem: true,
    styles: {
      primaryColor: '#059669',
      backgroundColor: '#F0FDF4',
      accentColor: '#3B82F6',
      textColor: '#1F2937',
      borderRadius: '8px',
      fontFamily: 'Inter, system-ui, sans-serif',
      buttonStyle: 'solid',
      inputStyle: 'outline',
      cardShadow: 'md',
      spacing: 'comfortable',
      showTrustBadges: true,
      showSecurityIndicators: true,
    },
    layout: DEFAULT_LAYOUT,
    components: DEFAULT_COMPONENTS,
  },
];

// ═══════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function seedPaymentPages() {
  console.log('🎨 Seeding Payment Page Themes...');

  // Create system themes
  for (const theme of SYSTEM_THEMES) {
    const existing = await prisma.checkoutPageTheme.findFirst({
      where: {
        name: theme.name,
        isSystem: true,
      },
    });

    if (!existing) {
      await prisma.checkoutPageTheme.create({
        data: theme,
      });
      console.log(`  ✓ Created theme: ${theme.name}`);
    } else {
      // Update existing system theme
      await prisma.checkoutPageTheme.update({
        where: { id: existing.id },
        data: {
          styles: theme.styles,
          layout: theme.layout,
          components: theme.components,
        },
      });
      console.log(`  ↻ Updated theme: ${theme.name}`);
    }
  }

  // Find demo company
  const demoCompany = await prisma.company.findFirst({
    where: {
      code: 'COFF',
    },
  });

  if (demoCompany) {
    console.log('\n📄 Seeding Demo Payment Pages...');

    // Get the Modern theme for demo pages
    const modernTheme = await prisma.checkoutPageTheme.findFirst({
      where: { name: 'Modern', isSystem: true },
    });

    // Demo payment pages
    const demoPages = [
      {
        name: 'Coffee Subscription Checkout',
        slug: 'coffee-subscription',
        type: PaymentPageType.SUBSCRIPTION,
        status: PaymentPageStatus.PUBLISHED,
        headline: 'Subscribe to Fresh Coffee',
        subheadline: 'Premium beans delivered to your door every month',
        brandColor: '#78350F',
        themeId: modernTheme?.id,
        paymentConfig: {
          allowedIntervals: ['monthly', 'yearly'],
          trialDays: 14,
          minimumAmount: 15.00,
        },
        acceptedGateways: {
          stripe: true,
          paypal: true,
        },
        customerFieldsConfig: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
          phone: { enabled: true, required: false },
          address: { enabled: true, required: false },
          shipping: { enabled: true, required: true },
        },
        aiInsightsEnabled: true,
        conversionTracking: true,
        publishedAt: new Date(),
      },
      {
        name: 'One-Time Purchase',
        slug: 'checkout',
        type: PaymentPageType.CHECKOUT,
        status: PaymentPageStatus.PUBLISHED,
        headline: 'Complete Your Purchase',
        subheadline: 'Secure checkout powered by industry-leading encryption',
        brandColor: '#3B82F6',
        themeId: modernTheme?.id,
        paymentConfig: {
          allowPartialPayments: false,
          collectShippingAddress: true,
        },
        acceptedGateways: {
          stripe: true,
          paypal: true,
          nmi: false,
          authorizenet: false,
        },
        customerFieldsConfig: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
          phone: { enabled: false, required: false },
          address: { enabled: true, required: true },
          shipping: { enabled: true, required: true },
        },
        aiInsightsEnabled: true,
        conversionTracking: true,
        publishedAt: new Date(),
      },
      {
        name: 'Invoice Payment',
        slug: 'pay-invoice',
        type: PaymentPageType.INVOICE,
        status: PaymentPageStatus.PUBLISHED,
        headline: 'Pay Your Invoice',
        subheadline: 'Quick and secure payment for your outstanding balance',
        brandColor: '#059669',
        themeId: modernTheme?.id,
        paymentConfig: {
          showInvoiceDetails: true,
          allowPartialPayments: true,
        },
        acceptedGateways: {
          stripe: true,
          paypal: true,
        },
        customerFieldsConfig: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
          phone: { enabled: false, required: false },
          address: { enabled: false, required: false },
          shipping: { enabled: false, required: false },
        },
        aiInsightsEnabled: false,
        conversionTracking: true,
        publishedAt: new Date(),
      },
      {
        name: 'Draft Checkout Page',
        slug: 'draft-checkout',
        type: PaymentPageType.CHECKOUT,
        status: PaymentPageStatus.DRAFT,
        headline: 'Coming Soon',
        subheadline: 'This checkout page is under construction',
        brandColor: '#6366F1',
        themeId: modernTheme?.id,
        paymentConfig: {},
        acceptedGateways: {
          stripe: true,
        },
        customerFieldsConfig: {
          name: { enabled: true, required: true },
          email: { enabled: true, required: true },
        },
        aiInsightsEnabled: false,
        conversionTracking: false,
      },
    ];

    for (const page of demoPages) {
      const existing = await prisma.paymentPage.findFirst({
        where: {
          slug: page.slug,
          companyId: demoCompany.id,
        },
      });

      if (!existing) {
        // Build the create data object explicitly
        const createData: Parameters<typeof prisma.paymentPage.create>[0]['data'] = {
          name: page.name,
          slug: page.slug,
          type: page.type,
          status: page.status,
          headline: page.headline,
          subheadline: page.subheadline,
          brandColor: page.brandColor,
          paymentConfig: page.paymentConfig,
          acceptedGateways: page.acceptedGateways,
          customerFieldsConfig: page.customerFieldsConfig,
          aiInsightsEnabled: page.aiInsightsEnabled,
          conversionTracking: page.conversionTracking,
          publishedAt: page.publishedAt,
          createdBy: 'system-seed', // Required audit field
          company: { connect: { id: demoCompany.id } },
        };

        // Add theme connection if provided
        if (page.themeId) {
          createData.theme = { connect: { id: page.themeId } };
        }

        await prisma.paymentPage.create({ data: createData });
        console.log(`  ✓ Created page: ${page.name}`);
      } else {
        console.log(`  · Skipped page: ${page.name} (exists)`);
      }
    }

    // Create sample sessions for analytics
    console.log('\n📊 Seeding Demo Payment Sessions...');

    const publishedPage = await prisma.paymentPage.findFirst({
      where: {
        slug: 'checkout',
        companyId: demoCompany.id,
      },
    });

    if (publishedPage) {
      const sessionData = [
        { status: PaymentSessionStatus.COMPLETED, total: 49.99, customerEmail: 'john@example.com' },
        { status: PaymentSessionStatus.COMPLETED, total: 129.99, customerEmail: 'jane@example.com' },
        { status: PaymentSessionStatus.COMPLETED, total: 89.99, customerEmail: 'bob@example.com' },
        { status: PaymentSessionStatus.FAILED, total: 199.99, customerEmail: 'failed@example.com' },
        { status: PaymentSessionStatus.ABANDONED, total: 75.00, customerEmail: null },
        { status: PaymentSessionStatus.PENDING, total: 59.99, customerEmail: 'pending@example.com' },
      ];

      // Session expires in 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      for (const session of sessionData) {
        await prisma.paymentPageSession.create({
          data: {
            pageId: publishedPage.id,
            sessionToken: `session_${Math.random().toString(36).substring(7)}`,
            status: session.status,
            subtotal: session.total,
            total: session.total,
            currency: 'USD',
            expiresAt,
            customerEmail: session.customerEmail,
            completedAt: session.status === PaymentSessionStatus.COMPLETED ? new Date() : null,
            failedAt: session.status === PaymentSessionStatus.FAILED ? new Date() : null,
          },
        });
      }
      console.log('  ✓ Created sample payment sessions');
    }
  }

  console.log('\n✅ Payment Pages seed complete!');
}

// Run if executed directly
if (require.main === module) {
  seedPaymentPages()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
