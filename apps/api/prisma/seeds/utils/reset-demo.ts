/**
 * Reset Demo Data Utility
 * Clears all demo data while preserving core data (organization, admin user, pricing plans)
 *
 * Usage:
 *   npx ts-node prisma/seeds/utils/reset-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDemoData() {
  console.log('🗑️  Resetting demo data...\n');

  // Delete in order of dependencies (most dependent first)

  // Delete usage & billing data
  console.log('  Deleting billing data...');
  await prisma.usagePeriod.deleteMany({});
  await prisma.clientSubscription.deleteMany({});

  // Delete transactions
  console.log('  Deleting transactions...');
  await prisma.transaction.deleteMany({});

  // Delete routing & payment infrastructure
  console.log('  Deleting routing rules...');
  await prisma.routingRule.deleteMany({});
  await prisma.accountPool.deleteMany({});
  await prisma.merchantAccount.deleteMany({});
  await prisma.paymentProvider.deleteMany({});

  // Delete momentum intelligence data
  console.log('  Deleting momentum intelligence data...');
  await prisma.churnSignal.deleteMany({});
  await prisma.churnRiskScore.deleteMany({});
  await prisma.saveFlowConfig.deleteMany({});
  await prisma.cSConfig.deleteMany({});
  await prisma.refundPolicy.deleteMany({});
  await prisma.rMAPolicy.deleteMany({});
  await prisma.termsDocument.deleteMany({});
  await prisma.contentTemplate.deleteMany({});
  await prisma.contentGenerationConfig.deleteMany({});

  // Delete customers
  console.log('  Deleting customers...');
  await prisma.customer.deleteMany({});

  // Delete role assignments (preserve roles themselves)
  console.log('  Deleting user role assignments...');
  await prisma.userRoleAssignment.deleteMany({});

  // Delete users except admin@avnz.io
  console.log('  Deleting demo users...');
  await prisma.user.deleteMany({
    where: {
      NOT: { email: 'admin@avnz.io' },
    },
  });

  // Delete companies
  console.log('  Deleting companies...');
  await prisma.company.deleteMany({});

  // Delete clients
  console.log('  Deleting clients...');
  await prisma.client.deleteMany({});

  console.log('\n✅ Demo data reset complete!');
  console.log('   Organization, admin user, pricing plans, and RBAC preserved.');
}

resetDemoData()
  .catch((e) => {
    console.error('Error resetting demo data:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
