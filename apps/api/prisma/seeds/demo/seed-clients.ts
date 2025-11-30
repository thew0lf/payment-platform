/**
 * Demo: Clients & Companies Seed
 * Creates demo clients and their companies for development/demo environments
 */

import { PrismaClient, ScopeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Reserved codes that might be confusing
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

export async function seedDemoClients(prisma: PrismaClient, organizationId: string) {
  console.log('🏪 Seeding demo clients & companies...');

  const allUsedCodes = new Set<string>();

  // Client 1: Velocity Agency
  const client1Code = generateUniqueCode('Velocity Agency', allUsedCodes);
  const client1 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId, slug: 'velocity-agency' } },
    update: { code: client1Code },
    create: {
      organizationId,
      name: 'Velocity Agency',
      slug: 'velocity-agency',
      code: client1Code,
      contactName: 'Sarah Chen',
      contactEmail: 'sarah@velocityagency.com',
      plan: 'PREMIUM',
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ Client:', client1.name, `(${client1Code})`);

  // Client Admin
  const clientAdminPassword = await bcrypt.hash('demo123', 10);
  await prisma.user.upsert({
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
  console.log('  ✓ Client admin: owner@velocityagency.com');

  // Companies for Client 1
  const companies1 = [
    { name: 'CoffeeCo', slug: 'coffee-co' },
    { name: 'FitBox', slug: 'fitbox' },
    { name: 'PetPals', slug: 'petpals' },
  ];

  const createdCompanies: Array<{ id: string; name: string; slug: string }> = [];

  for (const companyData of companies1) {
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
    createdCompanies.push(company);
    console.log('  ✓ Company:', company.name, `(${companyCode})`);

    // Company Manager
    const managerPassword = await bcrypt.hash('demo123', 10);
    await prisma.user.upsert({
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

    // Payment Provider
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
  }

  // Client 2: Digital First
  const client2Code = generateUniqueCode('Digital First', allUsedCodes);
  const client2 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId, slug: 'digital-first' } },
    update: { code: client2Code },
    create: {
      organizationId,
      name: 'Digital First',
      slug: 'digital-first',
      code: client2Code,
      contactName: 'Mike Torres',
      contactEmail: 'mike@digitalfirst.io',
      plan: 'STANDARD',
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ Client:', client2.name, `(${client2Code})`);

  // Companies for Client 2
  const companies2 = [
    { name: 'SaaSly', slug: 'saasly' },
    { name: 'CloudNine', slug: 'cloudnine' },
  ];

  for (const companyData of companies2) {
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
    createdCompanies.push(company);
    console.log('  ✓ Company:', company.name, `(${companyCode})`);
  }

  return { client1, client2, companies: createdCompanies };
}
