/**
 * Master Seed Runner
 * Orchestrates all seed scripts for the payment platform
 *
 * Environment:
 *   SEED_ENV=production  - Core only (org, admin, pricing, rbac)
 *   SEED_ENV=demo        - Core + full demo data
 *   SEED_ENV=development - Same as demo (default)
 *
 * Usage:
 *   npx prisma db seed                       # Run with SEED_ENV=development
 *   SEED_ENV=demo npx prisma db seed         # Run demo environment
 *   SEED_ENV=production npx prisma db seed   # Run production (core only)
 */

import { PrismaClient } from '@prisma/client';

// Core seeds
import { seedOrganization } from './seeds/core/seed-organization';
import { seedPricingPlans } from './seeds/core/seed-pricing';
import { seedRbac } from './seeds/seed-rbac';
import { seedCodeReviewChecklist } from './seeds/seed-code-review-checklist';
import { seedQAChecklist } from './seeds/seed-qa-checklist';

// Demo seeds
import {
  seedDemoClients,
  seedDemoCustomers,
  seedDemoTransactions,
  seedDemoMerchantAccounts,
  seedDemoAccountPools,
  seedDemoRoutingRules,
  seedDemoClientSubscription,
  seedCoffeeExplorer,
  seedCoffeeFunnel,
} from './seeds/demo';

const prisma = new PrismaClient();

type SeedEnvironment = 'production' | 'demo' | 'development';

function getSeedEnvironment(): SeedEnvironment {
  const env = process.env.SEED_ENV?.toLowerCase();
  if (env === 'production' || env === 'prod') return 'production';
  if (env === 'demo') return 'demo';
  return 'development'; // Default
}

async function main() {
  const seedEnv = getSeedEnvironment();

  console.log('🌱 Payment Platform - Database Seeding');
  console.log('=====================================');
  console.log(`📦 Environment: ${seedEnv.toUpperCase()}\n`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: CORE DATA (All environments)
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: Core Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create organization and admin
  const { org } = await seedOrganization(prisma);

  // Seed pricing plans
  await seedPricingPlans(prisma);

  // Seed RBAC permissions and roles
  await seedRbac();

  // Seed Code Review and QA Checklists
  await seedCodeReviewChecklist();
  await seedQAChecklist();

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: DEMO DATA (demo & development only)
  // ═══════════════════════════════════════════════════════════════
  if (seedEnv !== 'production') {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PHASE 2: Demo Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Create demo clients and companies
    const { client1, companies } = await seedDemoClients(prisma, org.id);

    // Get company IDs for seeding
    const companyIds = companies.map(c => c.id);

    // Seed customers
    await seedDemoCustomers(prisma, companyIds);

    // Seed transactions
    await seedDemoTransactions(prisma, companyIds);

    // Get first company for detailed demo data
    const primaryCompany = companies.find(c => c.slug === 'coffee-co');
    if (primaryCompany) {
      // Seed merchant accounts
      await seedDemoMerchantAccounts(prisma, primaryCompany.id);

      // Seed account pools
      const pools = await seedDemoAccountPools(prisma, primaryCompany.id);

      // Seed routing rules
      await seedDemoRoutingRules(prisma, primaryCompany.id, pools);
    }

    // Seed client subscription
    await seedDemoClientSubscription(prisma, client1.id);

    // Seed Coffee Explorer demo client (for landing page)
    await seedCoffeeExplorer(prisma, org.id);

    // Seed Coffee Explorer funnel
    await seedCoffeeFunnel(prisma);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seeding Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (seedEnv !== 'production') {
    console.log('📋 Test Accounts:');
    console.log('   Organization: admin@avnz.io / demo123');
    console.log('   Client:       owner@velocityagency.com / demo123');
    console.log('   Company:      manager@coffee-co.com / demo123');
    console.log('');
    console.log('☕ Coffee Explorer Demo:');
    console.log('   Admin:        admin@coffeeexplorer.com / demo123');
    console.log('   Manager:      manager@coffeeexplorer.com / demo123\n');
  } else {
    console.log('📋 Production Account:');
    console.log('   admin@avnz.io / demo123 (change password immediately!)\n');
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
