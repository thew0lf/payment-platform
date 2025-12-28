/**
 * Core: Pricing Plans Seed
 * Creates the default pricing plans available to clients
 *
 * Plan Types:
 * - DEFAULT: Standard tiers visible to all clients
 * - CUSTOM: Client-specific negotiated pricing (created via admin UI)
 * - LEGACY: Old plans being phased out
 */

import { PrismaClient } from '@prisma/client';

export async function seedPricingPlans(prisma: PrismaClient) {
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
      // New billing system fields
      planType: 'DEFAULT',
      isPublic: true,
      allowSelfUpgrade: true,
      allowSelfDowngrade: false, // Downgrades require ORG approval
      requiresApproval: false,
      // Stripe price IDs (to be configured in Stripe dashboard)
      stripePriceId: null, // Set to actual Stripe price ID for production
      stripeAnnualPriceId: null,
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
      // New billing system fields
      planType: 'DEFAULT',
      isPublic: true,
      allowSelfUpgrade: true,
      allowSelfDowngrade: false,
      requiresApproval: false,
      stripePriceId: null,
      stripeAnnualPriceId: null,
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
      // New billing system fields
      planType: 'DEFAULT',
      isPublic: true,
      allowSelfUpgrade: true,
      allowSelfDowngrade: false,
      requiresApproval: false,
      stripePriceId: null,
      stripeAnnualPriceId: null,
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
      // New billing system fields - Enterprise requires approval
      planType: 'DEFAULT',
      isPublic: true,
      allowSelfUpgrade: false, // Requires sales contact
      allowSelfDowngrade: false,
      requiresApproval: true, // Enterprise requires ORG approval
      stripePriceId: null,
      stripeAnnualPriceId: null,
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
        // New billing system fields
        planType: plan.planType,
        isPublic: plan.isPublic,
        allowSelfUpgrade: plan.allowSelfUpgrade,
        allowSelfDowngrade: plan.allowSelfDowngrade,
        requiresApproval: plan.requiresApproval,
        stripePriceId: plan.stripePriceId,
        stripeAnnualPriceId: plan.stripeAnnualPriceId,
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
        // New billing system fields
        planType: plan.planType,
        isPublic: plan.isPublic,
        allowSelfUpgrade: plan.allowSelfUpgrade,
        allowSelfDowngrade: plan.allowSelfDowngrade,
        requiresApproval: plan.requiresApproval,
        stripePriceId: plan.stripePriceId,
        stripeAnnualPriceId: plan.stripeAnnualPriceId,
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
