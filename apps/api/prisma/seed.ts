/**
 * Master Seed Runner
 * Orchestrates all seed scripts for the payment platform
 *
 * Usage:
 *   npx prisma db seed                    # Run all seeds
 *   SEED_DEMO=true npx prisma db seed     # Include demo data
 */

import { PrismaClient, ScopeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =============================================================================
// CODE GENERATION HELPERS
// =============================================================================

const RESERVED_CODES = new Set([
  '0000', 'AAAA', 'TEST', 'DEMO', 'NULL', 'NONE', 'XXXX', 'ZZZZ',
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

function generateUniqueCode(name: string, existingCodes: Set<string>): string {
  let code = extractCodeFromName(name);
  let attempt = 0;

  while (existingCodes.has(code) || RESERVED_CODES.has(code)) {
    attempt++;
    if (attempt <= 99) {
      const suffix = String(attempt).padStart(2, '0');
      code = extractCodeFromName(name).slice(0, 2) + suffix;
    } else {
      // Random fallback
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

// Single global set for ALL codes (clients + companies) - globally unique
const allUsedCodes = new Set<string>();

async function main() {
  console.log('🌱 Payment Platform - Database Seeding');
  console.log('=====================================\n');

  // Create Organization (avnz.io)
  const org = await prisma.organization.upsert({
    where: { slug: 'avnz-io' },
    update: {},
    create: {
      name: 'avnz.io',
      slug: 'avnz-io',
      domain: 'avnz.io',
      billingPlan: 'ENTERPRISE',
      billingStatus: 'ACTIVE',
    },
  });
  console.log('✅ Organization created:', org.name);

  // Create Organization Admin
  const orgAdminPassword = await bcrypt.hash('demo123', 10);
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@avnz.io' },
    update: {},
    create: {
      email: 'admin@avnz.io',
      passwordHash: orgAdminPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      scopeType: ScopeType.ORGANIZATION,
      scopeId: org.id,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      organizationId: org.id,
    },
  });
  console.log('✅ Org admin created:', orgAdmin.email);

  // Create Client 1: Velocity Agency
  const client1Code = generateUniqueCode('Velocity Agency', allUsedCodes);
  const client1 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'velocity-agency' } },
    update: { code: client1Code },
    create: {
      organizationId: org.id,
      name: 'Velocity Agency',
      slug: 'velocity-agency',
      code: client1Code,
      contactName: 'Sarah Chen',
      contactEmail: 'sarah@velocityagency.com',
      plan: 'PREMIUM',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Client created:', client1.name, `(${client1Code})`);

  // Create Client Admin
  const clientAdminPassword = await bcrypt.hash('demo123', 10);
  const clientAdmin = await prisma.user.upsert({
    where: { email: 'owner@velocityagency.com' },
    update: {},
    create: {
      email: 'owner@velocityagency.com',
      passwordHash: clientAdminPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      scopeType: ScopeType.CLIENT,
      scopeId: client1.id,
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      clientId: client1.id,
    },
  });
  console.log('✅ Client admin created:', clientAdmin.email);

  // Create Companies for Client 1
  const companies = [
    { name: 'CoffeeCo', slug: 'coffee-co' },
    { name: 'FitBox', slug: 'fitbox' },
    { name: 'PetPals', slug: 'petpals' },
  ];

  for (const companyData of companies) {
    // Company codes are globally unique (same pool as clients)
    const companyCode = generateUniqueCode(companyData.name, allUsedCodes);

    const company = await prisma.company.upsert({
      where: { clientId_slug: { clientId: client1.id, slug: companyData.slug } },
      update: { code: companyCode },
      create: {
        clientId: client1.id,
        name: companyData.name,
        slug: companyData.slug,
        code: companyCode,
        timezone: 'America/New_York',
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Company created:', company.name, `(${companyCode})`);

    // Create Company Manager
    const managerPassword = await bcrypt.hash('demo123', 10);
    const manager = await prisma.user.upsert({
      where: { email: `manager@${companyData.slug}.com` },
      update: {},
      create: {
        email: `manager@${companyData.slug}.com`,
        passwordHash: managerPassword,
        firstName: 'Manager',
        lastName: companyData.name,
        scopeType: ScopeType.COMPANY,
        scopeId: company.id,
        role: UserRole.MANAGER,
        status: 'ACTIVE',
        companyId: company.id,
        clientId: client1.id,
      },
    });
    console.log('✅ Company manager created:', manager.email);

    // Create Payment Provider
    await prisma.paymentProvider.upsert({
      where: { id: `${company.id}-payflow` },
      update: {},
      create: {
        id: `${company.id}-payflow`,
        companyId: company.id,
        name: 'PayPal Payflow',
        type: 'PAYFLOW',
        encryptedCredentials: 'encrypted_placeholder',
        isDefault: true,
        isActive: true,
        priority: 1,
        environment: 'sandbox',
      },
    });

    // Create some test customers
    for (let i = 1; i <= 5; i++) {
      await prisma.customer.upsert({
        where: {
          companyId_email_deletedAt: {
            companyId: company.id,
            email: `customer${i}@example.com`,
            deletedAt: null,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          email: `customer${i}@example.com`,
          firstName: `Customer`,
          lastName: `${i}`,
          status: 'ACTIVE',
        },
      });
    }

    // Create some test transactions
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED'];
    for (let i = 0; i < 5; i++) {
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          transactionNumber: `txn_${company.slug}_${Date.now()}_${i}`,
          type: 'CHARGE',
          amount: Math.random() * 100 + 10,
          currency: 'USD',
          status: statuses[i] as any,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Create Client 2: Digital First
  const client2Code = generateUniqueCode('Digital First', allUsedCodes);
  const client2 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'digital-first' } },
    update: { code: client2Code },
    create: {
      organizationId: org.id,
      name: 'Digital First',
      slug: 'digital-first',
      code: client2Code,
      contactName: 'Mike Torres',
      contactEmail: 'mike@digitalfirst.io',
      plan: 'STANDARD',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Client created:', client2.name, `(${client2Code})`);

  // Create companies for Client 2
  const client2Companies = [
    { name: 'SaaSly', slug: 'saasly' },
    { name: 'CloudNine', slug: 'cloudnine' },
  ];

  for (const companyData of client2Companies) {
    // Company codes are globally unique (same pool as clients)
    const companyCode = generateUniqueCode(companyData.name, allUsedCodes);

    const company = await prisma.company.upsert({
      where: { clientId_slug: { clientId: client2.id, slug: companyData.slug } },
      update: { code: companyCode },
      create: {
        clientId: client2.id,
        name: companyData.name,
        slug: companyData.slug,
        code: companyCode,
        timezone: 'UTC',
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Company created:', company.name, `(${companyCode})`);
  }

  // =============================================================================
  // SEED PRICING PLANS
  // =============================================================================
  await seedPricingPlans();

  // =============================================================================
  // SEED DEMO DATA (optional - set SEED_DEMO=true)
  // =============================================================================
  if (process.env.SEED_DEMO === 'true') {
    console.log('\n📦 SEED_DEMO=true - Adding demo data...\n');

    // Get the first company for demo data
    const demoCompany = await prisma.company.findFirst({
      where: { slug: 'coffee-co' },
    });

    // Get client for subscription
    const demoClient = await prisma.client.findFirst({
      where: { slug: 'velocity-agency' },
    });

    if (demoCompany && demoClient) {
      await seedDemoMerchantAccounts(demoCompany.id);
      const pools = await seedDemoAccountPools(demoCompany.id);
      await seedDemoRoutingRules(demoCompany.id, pools);
      await seedDemoClientSubscription(demoClient.id);
    } else {
      console.log('  ⚠ Demo company or client not found, skipping demo data');
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('   Organization: admin@avnz.io / demo123');
  console.log('   Client:       owner@velocityagency.com / demo123');
  console.log('   Company:      manager@coffee-co.com / demo123');
}

// =============================================================================
// PRICING PLANS
// =============================================================================

async function seedPricingPlans() {
  console.log('💰 Seeding pricing plans...');

  const plans = [
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Perfect for small businesses getting started',
      billingInterval: 'MONTHLY',
      baseCost: 4900, // $49/mo in cents
      currency: 'USD',
      sortOrder: 1,
      isDefault: true,
      included: {
        transactions: 500,
        volume: 2500000, // $25,000 in cents
        apiCalls: 10000,
        merchantAccounts: 2,
        companies: 5,
        users: 2,
        vaultEntries: 100,
        webhooks: 1000,
      },
      overage: {
        transactionPrice: 15, // $0.15 per transaction
        volumePercent: 0.0025, // 0.25%
        apiCallPrice: 10, // $0.10 per 1000 calls
        merchantAccountPrice: 2500, // $25 per account
        companyPrice: 1000, // $10 per company
        userPrice: 500, // $5 per user
        vaultEntryPrice: 5, // $0.05 per entry
      },
      features: [
        'basicReporting',
        'tokenization',
        'emailSupport',
        'apiAccess',
        'webhooks',
      ],
      limits: {
        maxCompanies: 10,
        maxUsers: 5,
        maxMerchantAccounts: 5,
      },
    },
    {
      name: 'growth',
      displayName: 'Growth',
      description: 'For growing businesses with multiple clients',
      billingInterval: 'MONTHLY',
      baseCost: 14900, // $149/mo
      currency: 'USD',
      sortOrder: 2,
      isDefault: false,
      included: {
        transactions: 2500,
        volume: 12500000, // $125,000
        apiCalls: 50000,
        merchantAccounts: 5,
        companies: 15,
        users: 5,
        vaultEntries: 500,
        webhooks: 5000,
      },
      overage: {
        transactionPrice: 10,
        volumePercent: 0.002,
        apiCallPrice: 8,
        merchantAccountPrice: 2000,
        companyPrice: 800,
        userPrice: 400,
        vaultEntryPrice: 3,
      },
      features: [
        'basicReporting',
        'advancedAnalytics',
        'tokenization',
        'emailSupport',
        'chatSupport',
        'apiAccess',
        'webhooks',
        'multipleProviders',
        'routingRules',
        'loadBalancing',
      ],
      limits: {
        maxCompanies: 25,
        maxUsers: 15,
        maxMerchantAccounts: 10,
      },
    },
    {
      name: 'pro',
      displayName: 'Pro',
      description: 'Full-featured solution for agencies',
      billingInterval: 'MONTHLY',
      baseCost: 29900, // $299/mo
      currency: 'USD',
      sortOrder: 3,
      isDefault: false,
      included: {
        transactions: 5000,
        volume: 25000000, // $250,000
        apiCalls: 100000,
        merchantAccounts: 10,
        companies: 25,
        users: 10,
        vaultEntries: 1000,
        webhooks: 10000,
      },
      overage: {
        transactionPrice: 5,
        volumePercent: 0.0015,
        apiCallPrice: 5,
        merchantAccountPrice: 1500,
        companyPrice: 500,
        userPrice: 300,
        vaultEntryPrice: 2,
      },
      features: [
        'basicReporting',
        'advancedAnalytics',
        'customReports',
        'dataExport',
        'tokenization',
        'fraudDetection',
        'threeDS',
        'emailSupport',
        'chatSupport',
        'phoneSupport',
        'apiAccess',
        'webhooks',
        'multipleProviders',
        'routingRules',
        'advancedRouting',
        'loadBalancing',
        'failover',
      ],
      limits: {
        maxCompanies: 50,
        maxUsers: 30,
        maxMerchantAccounts: 25,
      },
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Custom solution for large organizations',
      billingInterval: 'MONTHLY',
      baseCost: 0, // Custom pricing
      currency: 'USD',
      sortOrder: 4,
      isDefault: false,
      included: {
        transactions: 0, // Unlimited/custom
        volume: 0,
        apiCalls: 0,
        merchantAccounts: 0,
        companies: 0,
        users: 0,
        vaultEntries: 0,
        webhooks: 0,
      },
      overage: {
        transactionPrice: 0,
        volumePercent: 0,
        apiCallPrice: 0,
        merchantAccountPrice: 0,
        companyPrice: 0,
        userPrice: 0,
        vaultEntryPrice: 0,
      },
      features: [
        'basicReporting',
        'advancedAnalytics',
        'customReports',
        'dataExport',
        'tokenization',
        'fraudDetection',
        'threeDS',
        'emailSupport',
        'chatSupport',
        'phoneSupport',
        'dedicatedManager',
        'slaGuarantee',
        'apiAccess',
        'webhooks',
        'multipleProviders',
        'routingRules',
        'advancedRouting',
        'loadBalancing',
        'failover',
        'customBranding',
        'whiteLabel',
      ],
      limits: null, // No limits
      metadata: { isCustomPricing: true },
    },
  ];

  for (const plan of plans) {
    await prisma.pricingPlan.upsert({
      where: { name: plan.name },
      update: {
        displayName: plan.displayName,
        description: plan.description,
        billingInterval: plan.billingInterval,
        baseCost: plan.baseCost,
        currency: plan.currency,
        sortOrder: plan.sortOrder,
        isDefault: plan.isDefault,
        included: plan.included,
        overage: plan.overage,
        features: plan.features,
        limits: plan.limits,
        metadata: plan.metadata || null,
      },
      create: {
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        billingInterval: plan.billingInterval,
        baseCost: plan.baseCost,
        currency: plan.currency,
        sortOrder: plan.sortOrder,
        isDefault: plan.isDefault,
        status: 'active',
        included: plan.included,
        overage: plan.overage,
        features: plan.features,
        limits: plan.limits,
        metadata: plan.metadata || null,
      },
    });
    console.log(`  ✓ ${plan.displayName} plan`);
  }
}

// =============================================================================
// DEMO MERCHANT ACCOUNTS
// =============================================================================

async function seedDemoMerchantAccounts(companyId: string) {
  console.log('🏦 Seeding demo merchant accounts...');

  const accounts = [
    {
      companyId,
      name: 'NMI Primary',
      description: 'Main processing account for USD transactions',
      color: '#10B981',
      providerType: 'NMI',
      merchantId: 'demo_nmi_001',
      environment: 'sandbox',
      status: 'active',
      credentials: { apiKey: 'demo_key', securityKey: 'demo_secret' },
      dailyVolumeLimit: 5000000, // $50,000
      monthlyVolumeLimit: 100000000, // $1,000,000
      fees: {
        basePercentage: 2.9,
        baseFlatFee: 30,
        amexPercentage: 3.5,
      },
      restrictions: {
        allowedCountries: ['US', 'CA'],
        allowedCurrencies: ['USD', 'CAD'],
        primaryCurrency: 'USD',
        highRiskAllowed: false,
        achAllowed: true,
        recurringAllowed: true,
        tokenizationAllowed: true,
      },
      priority: 1,
      weight: 60,
      isDefault: true,
      isBackupOnly: false,
    },
    {
      companyId,
      name: 'NMI Backup',
      description: 'Backup account for failover',
      color: '#6366F1',
      providerType: 'NMI',
      merchantId: 'demo_nmi_002',
      environment: 'sandbox',
      status: 'active',
      credentials: { apiKey: 'demo_key_2', securityKey: 'demo_secret_2' },
      dailyVolumeLimit: 5000000,
      monthlyVolumeLimit: 100000000,
      fees: {
        basePercentage: 2.9,
        baseFlatFee: 30,
      },
      restrictions: {
        allowedCountries: ['US', 'CA'],
        allowedCurrencies: ['USD', 'CAD'],
        primaryCurrency: 'USD',
        highRiskAllowed: false,
        achAllowed: true,
        recurringAllowed: true,
        tokenizationAllowed: true,
      },
      priority: 2,
      weight: 40,
      isDefault: false,
      isBackupOnly: true,
    },
    {
      companyId,
      name: 'PayPal EUR',
      description: 'European transactions via PayPal Payflow',
      color: '#0070BA',
      providerType: 'PAYFLOW',
      merchantId: 'demo_payflow_eur',
      environment: 'sandbox',
      status: 'active',
      credentials: { partner: 'PayPal', vendor: 'demo', user: 'demo', password: 'demo' },
      dailyVolumeLimit: 2000000,
      monthlyVolumeLimit: 50000000,
      fees: {
        basePercentage: 2.4,
        baseFlatFee: 25,
        internationalPercentage: 1.0,
      },
      restrictions: {
        allowedCountries: ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE'],
        allowedCurrencies: ['EUR', 'GBP'],
        primaryCurrency: 'EUR',
        highRiskAllowed: false,
        achAllowed: false,
        recurringAllowed: true,
        tokenizationAllowed: true,
      },
      priority: 1,
      weight: 100,
      isDefault: false,
      isBackupOnly: false,
    },
  ];

  for (const account of accounts) {
    await prisma.merchantAccount.upsert({
      where: {
        companyId_name_deletedAt: {
          companyId: account.companyId,
          name: account.name,
          deletedAt: null,
        },
      },
      update: account,
      create: account,
    });
    console.log(`  ✓ ${account.name}`);
  }
}

// =============================================================================
// DEMO ACCOUNT POOLS
// =============================================================================

async function seedDemoAccountPools(companyId: string) {
  console.log('🎱 Seeding demo account pools...');

  const pools = [
    {
      companyId,
      name: 'US Primary Pool',
      description: 'Primary pool for US dollar transactions',
      color: '#10B981',
      balancingStrategy: 'WEIGHTED',
      status: 'active',
      accounts: [], // Would link to merchant account IDs
      failover: {
        enabled: true,
        maxAttempts: 3,
        retryDelayMs: 1000,
        excludeOnFailure: true,
        excludeDurationMs: 300000,
      },
      healthRouting: {
        enabled: true,
        minSuccessRate: 80,
        checkIntervalMs: 60000,
      },
      limitRouting: {
        enabled: true,
        warningThreshold: 0.80,
        redistributeThreshold: 0.90,
        excludeThreshold: 0.98,
      },
    },
    {
      companyId,
      name: 'EU Pool',
      description: 'Pool for European transactions',
      color: '#0070BA',
      balancingStrategy: 'PRIORITY',
      status: 'active',
      accounts: [],
      failover: {
        enabled: true,
        maxAttempts: 2,
        retryDelayMs: 1000,
        excludeOnFailure: true,
        excludeDurationMs: 300000,
      },
      healthRouting: {
        enabled: true,
        minSuccessRate: 85,
        checkIntervalMs: 60000,
      },
      limitRouting: {
        enabled: true,
        warningThreshold: 0.80,
        redistributeThreshold: 0.90,
        excludeThreshold: 0.98,
      },
    },
  ];

  const createdPools: { name: string; id: string }[] = [];

  for (const pool of pools) {
    const created = await prisma.accountPool.upsert({
      where: {
        companyId_name: {
          companyId: pool.companyId,
          name: pool.name,
        },
      },
      update: pool,
      create: pool,
    });
    createdPools.push({ name: pool.name, id: created.id });
    console.log(`  ✓ ${pool.name}`);
  }

  return createdPools;
}

// =============================================================================
// DEMO ROUTING RULES
// =============================================================================

async function seedDemoRoutingRules(
  companyId: string,
  pools: { name: string; id: string }[],
) {
  console.log('🔀 Seeding demo routing rules...');

  const usPool = pools.find((p) => p.name === 'US Primary Pool');
  const euPool = pools.find((p) => p.name === 'EU Pool');

  const rules = [
    {
      companyId,
      name: 'Block Sanctioned Countries',
      description: 'Block transactions from OFAC sanctioned countries',
      priority: 1,
      status: 'ACTIVE',
      conditions: {
        geo: {
          sanctionedCountries: true,
        },
      },
      actions: [
        {
          type: 'BLOCK',
          blockReason: 'Transaction origin is a sanctioned country',
          blockCode: 'SANCTIONED_COUNTRY',
        },
      ],
    },
    {
      companyId,
      name: 'Route EU to EU Pool',
      description: 'Route European transactions to the EU pool',
      priority: 10,
      status: 'ACTIVE',
      conditions: {
        geo: {
          continents: ['EUROPE'],
          currencies: ['EUR', 'GBP'],
        },
      },
      actions: [
        {
          type: 'ROUTE_TO_POOL',
          poolId: euPool?.id || 'eu-pool-placeholder',
        },
      ],
    },
    {
      companyId,
      name: 'Large Transaction Review',
      description: 'Flag large transactions for manual review',
      priority: 20,
      status: 'ACTIVE',
      conditions: {
        amount: {
          min: 500000, // $5,000+
        },
      },
      actions: [
        {
          type: 'FLAG_FOR_REVIEW',
          reviewReason: 'Large transaction amount',
          reviewPriority: 'high',
        },
        {
          type: 'REQUIRE_3DS',
        },
      ],
    },
    {
      companyId,
      name: 'Default US Routing',
      description: 'Default routing for US transactions',
      priority: 999,
      status: 'ACTIVE',
      conditions: {
        geo: {
          countries: ['US'],
        },
      },
      actions: [
        {
          type: 'ROUTE_TO_POOL',
          poolId: usPool?.id || 'us-pool-placeholder',
        },
      ],
    },
  ];

  for (const rule of rules) {
    await prisma.routingRule.upsert({
      where: {
        companyId_name_deletedAt: {
          companyId: rule.companyId,
          name: rule.name,
          deletedAt: null,
        },
      },
      update: {
        description: rule.description,
        priority: rule.priority,
        status: rule.status,
        conditions: rule.conditions,
        actions: rule.actions,
      },
      create: {
        companyId: rule.companyId,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        status: rule.status,
        conditions: rule.conditions,
        actions: rule.actions,
      },
    });
    console.log(`  ✓ ${rule.name}`);
  }
}

// =============================================================================
// DEMO CLIENT SUBSCRIPTION
// =============================================================================

async function seedDemoClientSubscription(clientId: string) {
  console.log('📋 Seeding demo client subscription...');

  // Find the Growth plan
  const growthPlan = await prisma.pricingPlan.findUnique({
    where: { name: 'growth' },
  });

  if (!growthPlan) {
    console.log('  ⚠ Growth plan not found, skipping subscription');
    return;
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await prisma.clientSubscription.upsert({
    where: { clientId },
    update: {
      planId: growthPlan.id,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    create: {
      clientId,
      planId: growthPlan.id,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      billingAnchorDay: 1,
    },
  });

  console.log('  ✓ Client subscription (Growth plan)');

  // Create usage period
  const subscription = await prisma.clientSubscription.findUnique({
    where: { clientId },
  });

  if (subscription) {
    await prisma.usagePeriod.upsert({
      where: {
        id: `${subscription.id}-${periodStart.toISOString().slice(0, 7)}`,
      },
      update: {},
      create: {
        id: `${subscription.id}-${periodStart.toISOString().slice(0, 7)}`,
        subscriptionId: subscription.id,
        clientId,
        periodStart,
        periodEnd,
        status: 'active',
        baseCost: growthPlan.baseCost,
      },
    });
    console.log('  ✓ Usage period created');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
