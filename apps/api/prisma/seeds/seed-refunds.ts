/**
 * Seed script for Refunds
 * Creates realistic refund data across different statuses and reasons
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding refunds...');

  // Get existing orders to create refunds against
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  if (orders.length === 0) {
    console.log('No orders found. Please seed orders first.');
    return;
  }

  console.log(`Found ${orders.length} orders to create refunds for`);

  // Get users for initiatedBy field (has FK to User)
  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.log('No users found. Please seed users first.');
    return;
  }
  console.log(`Found ${users.length} users`);

  const refundReasons = [
    'DAMAGED_ITEM',
    'WRONG_ITEM',
    'QUALITY_ISSUE',
    'SHIPPING_ISSUE',
    'CUSTOMER_REQUEST',
    'NOT_AS_DESCRIBED',
    'OTHER',
  ] as const;

  const refundStatuses = [
    'PENDING',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
  ] as const;

  const refundTypes = ['FULL', 'PARTIAL'] as const;
  const channels = ['WEB', 'PHONE', 'EMAIL', 'CHAT'] as const;

  const now = new Date();

  // Create refunds with various dates (including today, this week, this month)
  const refundsToCreate = [];

  for (let i = 0; i < Math.min(15, orders.length * 3); i++) {
    const order = orders[i % orders.length];
    const status = refundStatuses[Math.floor(Math.random() * refundStatuses.length)];
    const type = refundTypes[Math.floor(Math.random() * refundTypes.length)];
    const reason = refundReasons[Math.floor(Math.random() * refundReasons.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    // initiatedBy must be a valid User ID
    const initiatedByUser = users[Math.floor(Math.random() * users.length)];

    // Calculate refund amount based on type
    const orderTotal = Number(order.total);
    const requestedAmount = type === 'FULL'
      ? orderTotal
      : Math.round((orderTotal * (0.3 + Math.random() * 0.5)) * 100) / 100;

    // Create dates spread across different time periods
    let createdAt: Date;
    if (i < 3) {
      // Today
      createdAt = new Date(now.getTime() - Math.random() * 8 * 60 * 60 * 1000);
    } else if (i < 6) {
      // This week
      createdAt = new Date(now.getTime() - (1 + Math.random() * 6) * 24 * 60 * 60 * 1000);
    } else if (i < 10) {
      // This month
      createdAt = new Date(now.getTime() - (7 + Math.random() * 23) * 24 * 60 * 60 * 1000);
    } else {
      // Older
      createdAt = new Date(now.getTime() - (30 + Math.random() * 60) * 24 * 60 * 60 * 1000);
    }

    // Set status-dependent fields
    let approvedAmount: number | null = null;
    let approvedAt: Date | null = null;
    let approvedBy: string | null = null;
    let rejectedAt: Date | null = null;
    let rejectedBy: string | null = null;
    let rejectionReason: string | null = null;
    let processedAt: Date | null = null;
    let completedAt: Date | null = null;

    // Get a random user for approvedBy/rejectedBy (must be valid User IDs)
    const approverUser = users[Math.floor(Math.random() * users.length)];

    if (['APPROVED', 'PROCESSING', 'COMPLETED'].includes(status)) {
      approvedAmount = requestedAmount;
      approvedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      approvedBy = approverUser.id;
    }

    if (['PROCESSING', 'COMPLETED'].includes(status)) {
      processedAt = new Date((approvedAt || createdAt).getTime() + Math.random() * 12 * 60 * 60 * 1000);
    }

    if (status === 'COMPLETED') {
      completedAt = new Date((processedAt || createdAt).getTime() + Math.random() * 4 * 60 * 60 * 1000);
    }

    if (status === 'REJECTED') {
      rejectedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      rejectedBy = approverUser.id;
      rejectionReason = 'Refund request outside of return window';
    }

    refundsToCreate.push({
      companyId: order.companyId,
      customerId: order.customerId,
      orderId: order.id,
      type,
      status,
      reason,
      reasonDetails: getReasonDetails(reason),
      requestedAmount,
      approvedAmount,
      currency: order.currency,
      method: 'ORIGINAL_PAYMENT',
      approvalLevel: requestedAmount >= 500 ? 'TIER_3' : requestedAmount >= 100 ? 'TIER_2' : 'TIER_1',
      approvedBy,
      approvedAt,
      rejectedBy,
      rejectedAt,
      rejectionReason,
      processedAt,
      completedAt,
      initiatedBy: initiatedByUser.id,
      channel,
      customerImpact: getCustomerImpact(),
      fraudScore: Math.floor(Math.random() * 30),
      tags: getTags(reason, type),
      createdAt,
      updatedAt: completedAt || processedAt || approvedAt || rejectedAt || createdAt,
    });
  }

  // Insert refunds
  for (const refund of refundsToCreate) {
    await prisma.refund.create({ data: refund });
  }

  console.log(`Created ${refundsToCreate.length} refunds`);

  // Show summary by status
  const statusCounts = await prisma.refund.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('\nRefund counts by status:');
  statusCounts.forEach((s) => {
    console.log(`  ${s.status}: ${s._count}`);
  });

  console.log('\nRefunds seeded successfully!');
}

function getReasonDetails(reason: string): string {
  const details: Record<string, string> = {
    DAMAGED_ITEM: 'Item arrived with visible damage to packaging and product.',
    WRONG_ITEM: 'Received a different item than what was ordered.',
    QUALITY_ISSUE: 'Product quality does not meet expectations.',
    SHIPPING_ISSUE: 'Package was delayed significantly or lost in transit.',
    CUSTOMER_REQUEST: 'Customer changed their mind about the purchase.',
    NOT_AS_DESCRIBED: 'Product does not match the description on the website.',
    OTHER: 'Miscellaneous issue reported by customer.',
  };
  return details[reason] || 'No additional details provided.';
}

function getCustomerImpact(): string {
  const impacts = ['LOW', 'MEDIUM', 'HIGH'];
  return impacts[Math.floor(Math.random() * impacts.length)];
}

function getTags(reason: string, type: string): string[] {
  const tags: string[] = [];
  if (type === 'PARTIAL') tags.push('partial-refund');
  if (reason === 'DAMAGED_ITEM') tags.push('quality-issue', 'shipping-damage');
  if (reason === 'WRONG_ITEM') tags.push('fulfillment-error');
  if (reason === 'SHIPPING_ISSUE') tags.push('carrier-issue');
  return tags;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
