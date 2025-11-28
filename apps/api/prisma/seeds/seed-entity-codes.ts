/**
 * Backfill Entity Codes
 *
 * This script generates unique 4-character codes for existing Clients and Companies
 * that don't have codes assigned yet.
 *
 * IMPORTANT: All codes (client AND company) are globally unique across both tables.
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

// Single global set for ALL codes (clients + companies)
const allUsedCodes = new Set<string>();

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
 * Generate a globally unique code, checking for collisions across ALL entities
 */
function generateUniqueCode(name: string): string {
  let code = extractCodeFromName(name);
  let attempt = 0;

  while (allUsedCodes.has(code) || RESERVED_CODES.has(code)) {
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

  allUsedCodes.add(code);
  return code;
}

/**
 * Load all existing codes from both tables into the global set
 */
async function loadExistingCodes() {
  const [clientsWithCodes, companiesWithCodes] = await Promise.all([
    prisma.client.findMany({
      where: { code: { not: null } },
      select: { code: true },
    }),
    prisma.company.findMany({
      where: { code: { not: null } },
      select: { code: true },
    }),
  ]);

  clientsWithCodes.forEach(c => c.code && allUsedCodes.add(c.code));
  companiesWithCodes.forEach(c => c.code && allUsedCodes.add(c.code));

  console.log(`Loaded ${allUsedCodes.size} existing codes`);
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

  // Generate codes for each client
  for (const client of clients) {
    const code = generateUniqueCode(client.name);

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

  // Generate globally unique codes for each company
  for (const company of companies) {
    const code = generateUniqueCode(company.name);

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
  console.log('  Entity Code Backfill (Globally Unique)');
  console.log('═══════════════════════════════════════════\n');

  // First, load all existing codes to prevent collisions
  await loadExistingCodes();

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
