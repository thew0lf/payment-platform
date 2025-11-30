/**
 * Demo: Transactions Seed
 * Creates demo transactions for each company
 */

import { PrismaClient } from '@prisma/client';

export async function seedDemoTransactions(prisma: PrismaClient, companyIds: string[]) {
  console.log('💳 Seeding demo transactions...');

  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];
  const amounts = [26.95, 49.99, 34.95, 99.99, 149.99, 24.95, 53.90, 79.00];

  let totalCreated = 0;

  for (const companyId of companyIds) {
    // Get company slug for transaction numbers
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    });

    // Create 15 transactions per company over the past 30 days
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);

      await prisma.transaction.create({
        data: {
          companyId,
          transactionNumber: `txn_${company?.slug}_${Date.now()}_${i}`,
          type: i % 5 === 0 ? 'REFUND' : 'CHARGE',
          amount: amounts[i % amounts.length],
          currency: 'USD',
          status: statuses[i % statuses.length] as any,
          createdAt,
        },
      });
      totalCreated++;
    }
  }

  console.log(`  ✓ Created ${totalCreated} transactions across ${companyIds.length} companies`);
}
