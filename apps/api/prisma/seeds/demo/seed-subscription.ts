/**
 * Demo: Client Subscription Seed
 * Creates demo subscription for clients
 */

import { PrismaClient } from '@prisma/client';

export async function seedDemoClientSubscription(prisma: PrismaClient, clientId: string) {
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
