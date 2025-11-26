import { PrismaClient, ScopeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
  console.log('✅ Organization created:', org.name);

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
  console.log('✅ Org admin created:', orgAdmin.email);

  // Create Client 1: Velocity Agency
  const client1 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'velocity-agency' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Velocity Agency',
      slug: 'velocity-agency',
      contactName: 'Sarah Chen',
      contactEmail: 'sarah@velocityagency.com',
      plan: 'PREMIUM',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Client created:', client1.name);

  // Create Client Admin
  const clientAdminPassword = await bcrypt.hash('demo123', 10);
  const clientAdmin = await prisma.user.upsert({
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
  console.log('✅ Client admin created:', clientAdmin.email);

  // Create Companies for Client 1
  const companies = [
    { name: 'CoffeeCo', slug: 'coffee-co' },
    { name: 'FitBox', slug: 'fitbox' },
    { name: 'PetPals', slug: 'petpals' },
  ];

  for (const companyData of companies) {
    const company = await prisma.company.upsert({
      where: { clientId_slug: { clientId: client1.id, slug: companyData.slug } },
      update: {},
      create: {
        clientId: client1.id,
        name: companyData.name,
        slug: companyData.slug,
        timezone: 'America/New_York',
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Company created:', company.name);

    // Create Company Manager
    const managerPassword = await bcrypt.hash('demo123', 10);
    const manager = await prisma.user.upsert({
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
    console.log('✅ Company manager created:', manager.email);

    // Create Payment Provider
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

    // Create some test customers
    for (let i = 1; i <= 5; i++) {
      await prisma.customer.upsert({
        where: {
          companyId_email: {
            companyId: company.id,
            email: `customer${i}@example.com`,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          email: `customer${i}@example.com`,
          firstName: `Customer`,
          lastName: `${i}`,
          status: 'ACTIVE',
        },
      });
    }

    // Create some test transactions
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED'];
    for (let i = 0; i < 5; i++) {
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          transactionNumber: `txn_${company.slug}_${Date.now()}_${i}`,
          type: 'CHARGE',
          amount: Math.random() * 100 + 10,
          currency: 'USD',
          status: statuses[i] as any,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Create Client 2: Digital First
  const client2 = await prisma.client.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'digital-first' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Digital First',
      slug: 'digital-first',
      contactName: 'Mike Torres',
      contactEmail: 'mike@digitalfirst.io',
      plan: 'STANDARD',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Client created:', client2.name);

  // Create companies for Client 2
  const client2Companies = [
    { name: 'SaaSly', slug: 'saasly' },
    { name: 'CloudNine', slug: 'cloudnine' },
  ];

  for (const companyData of client2Companies) {
    const company = await prisma.company.upsert({
      where: { clientId_slug: { clientId: client2.id, slug: companyData.slug } },
      update: {},
      create: {
        clientId: client2.id,
        name: companyData.name,
        slug: companyData.slug,
        timezone: 'UTC',
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Company created:', company.name);
  }

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('   Organization: admin@avnz.io / demo123');
  console.log('   Client:       owner@velocityagency.com / demo123');
  console.log('   Company:      manager@coffee-co.com / demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
