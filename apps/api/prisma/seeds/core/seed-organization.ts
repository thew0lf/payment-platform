/**
 * Core: Organization & Admin User Seed
 * Creates the base organization and platform admin user
 */

import { PrismaClient, ScopeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedOrganization(prisma: PrismaClient) {
  console.log('🏢 Seeding organization...');

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
  console.log('  ✓ Organization:', org.name);

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
  console.log('  ✓ Org admin:', orgAdmin.email);

  return { org, orgAdmin };
}
