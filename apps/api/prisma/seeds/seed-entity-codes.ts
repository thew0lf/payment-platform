/**
 * Backfill Entity Codes
 *
 * This script generates unique 4-character codes for existing Clients and Companies
 * that don't have codes assigned yet.
 *
 * Usage:
 *   npx ts-node prisma/seeds/seed-entity-codes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reserved codes that might be confusing
const RESERVED_CODES = new Set([
  '0000', 'AAAA', 'TEST', 'DEMO', 'NULL', 'NONE', 'XXXX', 'ZZZZ',
]);

/**
 * Extract a 4-character code from a name
 */
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

/**
 * Generate a unique code, checking for collisions
 */
function generateUniqueCode(name: string, existingCodes: Set<string>): string {
  let code = extractCodeFromName(name);
  let attempt = 0;

  while (existingCodes.has(code) || RESERVED_CODES.has(code)) {
    attempt++;
    if (attempt <= 99) {
      const suffix = String(attempt).padStart(2, '0');
      code = extractCodeFromName(name).slice(0, 2) + suffix;
    } else {
      // Random fallback
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

async function seedClientCodes() {
  console.log('Seeding client codes...');

  // Get clients without codes
  const clients = await prisma.client.findMany({
    where: { code: null },
  });

  if (clients.length === 0) {
    console.log('  No clients need codes');
    return 0;
  }

  // Load existing codes to avoid collisions
  const existingCodes = new Set<string>();
  const clientsWithCodes = await prisma.client.findMany({
    where: { code: { not: null } },
    select: { code: true },
  });
  clientsWithCodes.forEach(c => {
    if (c.code) existingCodes.add(c.code);
  });

  // Generate codes for each client
  for (const client of clients) {
    const code = generateUniqueCode(client.name, existingCodes);

    await prisma.client.update({
      where: { id: client.id },
      data: { code },
    });

    console.log(`  Client "${client.name}" -> ${code}`);
  }

  console.log(`Seeded ${clients.length} client codes`);
  return clients.length;
}

async function seedCompanyCodes() {
  console.log('\nSeeding company codes...');

  // Get companies without codes
  const companies = await prisma.company.findMany({
    where: { code: null },
    include: { client: true },
  });

  if (companies.length === 0) {
    console.log('  No companies need codes');
    return 0;
  }

  // Track codes per client (company codes are unique per client)
  const codesByClient = new Map<string, Set<string>>();

  // Load existing codes
  const companiesWithCodes = await prisma.company.findMany({
    where: { code: { not: null } },
    select: { clientId: true, code: true },
  });

  for (const c of companiesWithCodes) {
    if (!codesByClient.has(c.clientId)) {
      codesByClient.set(c.clientId, new Set());
    }
    if (c.code) {
      codesByClient.get(c.clientId)!.add(c.code);
    }
  }

  // Generate codes for each company
  for (const company of companies) {
    if (!codesByClient.has(company.clientId)) {
      codesByClient.set(company.clientId, new Set());
    }
    const existingCodes = codesByClient.get(company.clientId)!;

    const code = generateUniqueCode(company.name, existingCodes);

    await prisma.company.update({
      where: { id: company.id },
      data: { code },
    });

    console.log(`  Company "${company.name}" (${company.client?.name}) -> ${code}`);
  }

  console.log(`Seeded ${companies.length} company codes`);
  return companies.length;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Entity Code Backfill');
  console.log('═══════════════════════════════════════════\n');

  const clientCount = await seedClientCodes();
  const companyCount = await seedCompanyCodes();

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Complete! ${clientCount} clients, ${companyCount} companies`);
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Error seeding codes:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
