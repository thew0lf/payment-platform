/**
 * Demo: Merchant Accounts, Account Pools, and Routing Rules Seed
 * Creates demo payment processing infrastructure
 */

import { PrismaClient } from '@prisma/client';

export async function seedDemoMerchantAccounts(prisma: PrismaClient, companyId: string) {
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
      dailyVolumeLimit: 5000000,
      monthlyVolumeLimit: 100000000,
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

export async function seedDemoAccountPools(prisma: PrismaClient, companyId: string) {
  console.log('🎱 Seeding demo account pools...');

  const pools = [
    {
      companyId,
      name: 'US Primary Pool',
      description: 'Primary pool for US dollar transactions',
      color: '#10B981',
      balancingStrategy: 'WEIGHTED',
      status: 'active',
      accounts: [],
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

export async function seedDemoRoutingRules(
  prisma: PrismaClient,
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
