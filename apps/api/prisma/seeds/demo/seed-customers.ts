/**
 * Demo: Customers Seed
 * Creates demo customers for each company
 */

import { PrismaClient } from '@prisma/client';

export async function seedDemoCustomers(prisma: PrismaClient, companyIds: string[]) {
  console.log('👥 Seeding demo customers...');

  const customerTemplates = [
    { firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com' },
    { firstName: 'Mike', lastName: 'Torres', email: 'mike@example.com' },
    { firstName: 'Jennifer', lastName: 'Lee', email: 'jen@example.com' },
    { firstName: 'Alex', lastName: 'Kim', email: 'alex@example.com' },
    { firstName: 'Chris', lastName: 'Wong', email: 'chris@example.com' },
    { firstName: 'Dana', lastName: 'Martinez', email: 'dana@example.com' },
    { firstName: 'Evan', lastName: 'Johnson', email: 'evan@example.com' },
    { firstName: 'Fiona', lastName: 'Brown', email: 'fiona@example.com' },
  ];

  let totalCreated = 0;

  for (const companyId of companyIds) {
    for (const template of customerTemplates) {
      const email = `${template.email.split('@')[0]}.${companyId.slice(-4)}@example.com`;

      await prisma.customer.upsert({
        where: {
          companyId_email_deletedAt: {
            companyId,
            email,
            deletedAt: null,
          },
        },
        update: {},
        create: {
          companyId,
          email,
          firstName: template.firstName,
          lastName: template.lastName,
          status: 'ACTIVE',
        },
      });
      totalCreated++;
    }
  }

  console.log(`  ✓ Created ${totalCreated} customers across ${companyIds.length} companies`);
}
