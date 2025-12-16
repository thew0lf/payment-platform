/**
 * Core: Organization & Admin User Seed
 * Creates the base organization and platform admin user
 */

import { PrismaClient, ScopeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Get admin password from environment or use demo password for dev/demo
 * SEED_ADMIN_PASSWORD should be set in production
 */
function getAdminPassword(): string {
  const seedEnv = process.env.SEED_ENV?.toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (seedEnv === 'production' || seedEnv === 'prod') {
    if (!adminPassword) {
      throw new Error(
        'SEED_ADMIN_PASSWORD environment variable is required for production seeding.\n' +
        'Set a secure password before running production seeds.'
      );
    }
    return adminPassword;
  }

  // Dev/demo environments use demo password (safe because not production)
  return adminPassword || 'demo123';
}

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
  const adminPassword = getAdminPassword();
  const orgAdminPassword = await bcrypt.hash(adminPassword, 10);
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
