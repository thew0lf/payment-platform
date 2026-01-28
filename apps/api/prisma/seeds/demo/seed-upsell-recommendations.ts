/**
 * Demo: Upsell, Recommendations, and Cart Save Seed Data
 * Creates sample configurations for the new cart intelligence features
 */

import { PrismaClient, UpsellType, UpsellUrgency } from '@prisma/client';

export async function seedUpsellRecommendations(prisma: PrismaClient) {
  console.log('🎯 Seeding upsell & recommendation configs...');

  // Find the Coffee Explorer company
  const company = await prisma.company.findFirst({
    where: { slug: 'ce-store' },
  });

  if (!company) {
    console.log('  ⚠ Coffee Explorer company not found, skipping upsell seed');
    return;
  }

  // Get some products for upsell rules
  const products = await prisma.product.findMany({
    where: { companyId: company.id, status: 'ACTIVE', deletedAt: null },
    take: 5,
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. UPSELL TARGETING RULES
  // ═══════════════════════════════════════════════════════════════

  const existingRules = await prisma.upsellTargetingRule.count({
    where: { companyId: company.id },
  });

  if (existingRules === 0) {
    const upsellRules = [
      {
        companyId: company.id,
        name: 'Free Shipping Threshold',
        description: 'Encourage customers to add more items to qualify for free shipping',
        priority: 100,
        enabled: true,
        conditions: {
          cartSubtotal: { min: 20, max: 34.99 },
          freeShippingThreshold: 35,
        },
        upsellType: UpsellType.FREE_SHIPPING_ADD,
        offer: {
          targetAmount: 35,
          message: 'Add ${remaining} more for FREE shipping!',
          suggestProducts: true,
        },
        message: 'You\'re so close to free shipping!',
        urgency: UpsellUrgency.HIGH,
        placements: ['cart_page', 'mini_cart', 'checkout'],
        maxImpressions: 3,
      },
      {
        companyId: company.id,
        name: 'Bulk Discount - Buy 3 Save 15%',
        description: 'Encourage quantity purchases',
        priority: 90,
        enabled: true,
        conditions: {
          itemQuantity: { min: 1, max: 2 },
          productCategories: ['coffee-beans'],
        },
        upsellType: UpsellType.QUANTITY_DISCOUNT,
        offer: {
          requiredQuantity: 3,
          discountPercent: 15,
          stackable: false,
        },
        message: 'Buy 3 bags and save 15%!',
        urgency: UpsellUrgency.MEDIUM,
        placements: ['product_page', 'cart_page'],
        maxImpressions: 2,
      },
      {
        companyId: company.id,
        name: 'Subscription Upgrade',
        description: 'Promote subscription for repeat purchases',
        priority: 80,
        enabled: true,
        conditions: {
          isReturningCustomer: true,
          hasSubscription: false,
          cartContainsSubscribable: true,
        },
        upsellType: UpsellType.SUBSCRIPTION,
        offer: {
          discountPercent: 20,
          defaultFrequency: 'MONTHLY',
          freeShipping: true,
        },
        message: 'Subscribe & Save 20% + Free Shipping',
        urgency: UpsellUrgency.MEDIUM,
        placements: ['cart_page', 'checkout'],
        maxImpressions: 1,
      },
      {
        companyId: company.id,
        name: 'Complementary Products',
        description: 'Suggest items that go well together',
        priority: 70,
        enabled: true,
        conditions: {
          cartContainsCategory: 'coffee-beans',
          cartDoesNotContain: ['grinder', 'filter'],
        },
        upsellType: UpsellType.COMPLEMENTARY,
        offer: {
          suggestCategories: ['accessories', 'brewing-equipment'],
          maxSuggestions: 3,
          discountPercent: 10,
        },
        message: 'Complete your coffee setup',
        urgency: UpsellUrgency.LOW,
        placements: ['cart_page', 'post_add_to_cart'],
        maxImpressions: 2,
      },
      {
        companyId: company.id,
        name: 'Free Gift Threshold',
        description: 'Free gift for orders over $50',
        priority: 85,
        enabled: true,
        conditions: {
          cartSubtotal: { min: 40, max: 49.99 },
        },
        upsellType: UpsellType.FREE_GIFT_THRESHOLD,
        offer: {
          thresholdAmount: 50,
          giftProductId: products[0]?.id,
          giftName: 'Free Sample Pack',
          giftValue: 9.99,
        },
        message: 'Spend $10 more and get a FREE sample pack!',
        urgency: UpsellUrgency.HIGH,
        placements: ['cart_page', 'checkout'],
        maxImpressions: 2,
      },
    ];

    for (const rule of upsellRules) {
      await prisma.upsellTargetingRule.create({ data: rule });
    }
    console.log(`  ✓ Created ${upsellRules.length} upsell targeting rules`);
  } else {
    console.log(`  ⚠ Upsell rules already exist (${existingRules}), skipping`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. RECOMMENDATION CONFIG
  // ═══════════════════════════════════════════════════════════════

  const existingRecommendConfig = await prisma.recommendationConfig.findUnique({
    where: { companyId: company.id },
  });

  if (!existingRecommendConfig) {
    await prisma.recommendationConfig.create({
      data: {
        companyId: company.id,
        alsoBought: {
          enabled: true,
          maxProducts: 4,
          minConfidence: 0.3,
          lookbackDays: 90,
          excludeOwnedProducts: true,
        },
        youMightLike: {
          enabled: true,
          maxProducts: 6,
          algorithm: 'collaborative_filtering',
          fallbackToPopular: true,
          diversityFactor: 0.3,
        },
        frequentlyViewed: {
          enabled: true,
          maxProducts: 4,
          sessionBased: true,
          requireMultipleViews: false,
        },
        global: {
          enablePersonalization: true,
          respectInventory: true,
          excludeOutOfStock: true,
          boostNewArrivals: true,
          newArrivalDays: 30,
          boostFactor: 1.2,
        },
      },
    });
    console.log('  ✓ Created recommendation config');
  } else {
    console.log('  ⚠ Recommendation config already exists, skipping');
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. CART SAVE CONFIG (Abandonment Recovery)
  // ═══════════════════════════════════════════════════════════════

  const existingCartSaveConfig = await prisma.cartSaveConfig.findUnique({
    where: { companyId: company.id },
  });

  if (!existingCartSaveConfig) {
    await prisma.cartSaveConfig.create({
      data: {
        companyId: company.id,
        enabled: true,
        stageConfigs: {
          stage1_gentle_reminder: {
            enabled: true,
            delayMinutes: 60,
            channels: ['email'],
            template: 'cart_reminder_gentle',
            triggers: ['social_proof', 'scarcity'],
            offer: null,
          },
          stage2_incentive: {
            enabled: true,
            delayMinutes: 1440, // 24 hours
            channels: ['email', 'sms'],
            template: 'cart_reminder_incentive',
            triggers: ['urgency', 'loss_aversion'],
            offer: {
              type: 'percentage',
              value: 10,
              code: 'COMEBACK10',
              expiresInHours: 48,
            },
          },
          stage3_last_chance: {
            enabled: true,
            delayMinutes: 4320, // 72 hours
            channels: ['email'],
            template: 'cart_reminder_final',
            triggers: ['urgency', 'scarcity', 'loss_aversion'],
            offer: {
              type: 'percentage',
              value: 15,
              code: 'LASTCHANCE15',
              expiresInHours: 24,
              freeShipping: true,
            },
          },
          stage4_voice_outreach: {
            enabled: false, // Disabled by default
            delayMinutes: 10080, // 7 days
            channels: ['voice'],
            template: 'cart_recovery_voice',
            triggers: ['personalization'],
            offer: {
              type: 'percentage',
              value: 20,
              code: 'VIP20',
              expiresInHours: 72,
            },
            voiceConfig: {
              maxAttempts: 2,
              callWindow: { start: 10, end: 18 },
              script: 'cart_recovery_friendly',
            },
          },
        },
        maxAttemptsPerCart: 10,
        respectUnsubscribe: true,
        blackoutHoursStart: 22,
        blackoutHoursEnd: 8,
      },
    });
    console.log('  ✓ Created cart save config');
  } else {
    console.log('  ⚠ Cart save config already exists, skipping');
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. PRODUCT BULK DISCOUNTS
  // ═══════════════════════════════════════════════════════════════

  if (products.length > 0) {
    const existingBulkDiscounts = await prisma.productBulkDiscount.count({
      where: { companyId: company.id },
    });

    if (existingBulkDiscounts === 0) {
      // Add bulk discount to first 2 products
      for (const product of products.slice(0, 2)) {
        await prisma.productBulkDiscount.create({
          data: {
            productId: product.id,
            companyId: company.id,
            enabled: true,
            tiers: [
              { quantity: 2, discountPercent: 5, label: 'Buy 2, Save 5%' },
              { quantity: 3, discountPercent: 10, label: 'Buy 3, Save 10%' },
              { quantity: 5, discountPercent: 15, label: 'Buy 5+, Save 15%' },
            ],
            stackWithOtherDiscounts: false,
            maxDiscountPercent: 15,
          },
        });
      }
      console.log('  ✓ Created bulk discount configs for 2 products');
    } else {
      console.log(`  ⚠ Bulk discounts already exist (${existingBulkDiscounts}), skipping`);
    }
  }

  console.log('  ✓ Upsell & recommendations seeding complete');
}

export default seedUpsellRecommendations;
