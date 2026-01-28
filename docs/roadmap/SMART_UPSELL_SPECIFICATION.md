# Smart Upsell & Dynamic Discount Specification

## Executive Summary

This specification details the intelligent upsell system with smart discounting for bulk orders, subscription conversions, and AI-powered targeting. The goal is to maximize average order value (AOV) while providing genuine value to customers.

---

## Table of Contents

1. [Upsell Philosophy](#1-upsell-philosophy)
2. [Smart Bulk Discounting](#2-smart-bulk-discounting)
3. [Subscription Upsell Engine](#3-subscription-upsell-engine)
4. [AI-Powered Targeting](#4-ai-powered-targeting)
5. [Product Page Recommendations (Amazon-Style)](#5-product-page-recommendations-amazon-style)
6. [Upsell Placements](#6-upsell-placements)
7. [UI/UX Design](#7-uiux-design)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [Implementation](#10-implementation)

---

## 1. Upsell Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Value-First** | Every upsell must provide genuine value to the customer |
| **Context-Aware** | Show relevant offers based on cart contents and behavior |
| **Non-Intrusive** | Enhance the experience, don't obstruct checkout |
| **Transparent Savings** | Clearly show original vs. discounted pricing |
| **Smart Limits** | Don't overwhelm with too many offers (max 2-3 per page) |

### Upsell Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UPSELL PRIORITY LADDER                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Priority 1: THRESHOLD UPSELLS (free shipping, free gift)               │
│  ────────────────────────────────────────────────────────────────────   │
│  Why: Immediate, tangible value. "Add $12 for FREE shipping"            │
│  When: Cart is close to threshold                                        │
│                                                                          │
│  Priority 2: BULK/QUANTITY DISCOUNTS                                    │
│  ────────────────────────────────────────────────────────────────────   │
│  Why: Increases units per order. "Buy 2, save 15%"                      │
│  When: Single-quantity items in cart                                     │
│                                                                          │
│  Priority 3: SUBSCRIPTION CONVERSION                                    │
│  ────────────────────────────────────────────────────────────────────   │
│  Why: LTV multiplier. "Subscribe & save 20%"                            │
│  When: Consumable products, repeat purchase history                      │
│                                                                          │
│  Priority 4: BUNDLE UPGRADES                                            │
│  ────────────────────────────────────────────────────────────────────   │
│  Why: Higher AOV. "Complete the set and save $25"                       │
│  When: Partial bundle in cart                                            │
│                                                                          │
│  Priority 5: COMPLEMENTARY PRODUCTS                                     │
│  ────────────────────────────────────────────────────────────────────   │
│  Why: Cross-sell revenue. "Pairs perfectly with..."                     │
│  When: AI detects complementary fit                                      │
│                                                                          │
│  Priority 6: PREMIUM UPGRADES                                           │
│  ────────────────────────────────────────────────────────────────────   │
│  Why: Margin improvement. "Upgrade to Pro for +$20"                     │
│  When: Base version in cart, customer can afford upgrade                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Smart Bulk Discounting

### Overview

Dynamic quantity-based pricing that encourages larger orders while maintaining profitability.

### Discount Tiers Configuration

```typescript
interface BulkDiscountTier {
  minQuantity: number;
  maxQuantity: number | null;  // null = unlimited
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'UNIT_PRICE';
  discountValue: number;
  label: string;  // "Buy 2, Save 10%"
}

interface ProductBulkDiscount {
  productId: string;
  enabled: boolean;
  tiers: BulkDiscountTier[];
  stackWithOtherDiscounts: boolean;
  maxDiscountPercent: number;  // Cap total discount
  validFrom?: Date;
  validUntil?: Date;
}

// Example: Coffee product
const coffeeBulkDiscount: ProductBulkDiscount = {
  productId: 'prod_signature_blend',
  enabled: true,
  tiers: [
    { minQuantity: 2, maxQuantity: 2, discountType: 'PERCENTAGE', discountValue: 10, label: 'Buy 2, Save 10%' },
    { minQuantity: 3, maxQuantity: 4, discountType: 'PERCENTAGE', discountValue: 15, label: 'Buy 3+, Save 15%' },
    { minQuantity: 5, maxQuantity: 9, discountType: 'PERCENTAGE', discountValue: 20, label: 'Buy 5+, Save 20%' },
    { minQuantity: 10, maxQuantity: null, discountType: 'PERCENTAGE', discountValue: 25, label: 'Buy 10+, Save 25%' },
  ],
  stackWithOtherDiscounts: false,
  maxDiscountPercent: 30,
};
```

### Smart Tier Recommendations

```typescript
interface BulkUpsellRecommendation {
  product: Product;
  currentQuantity: number;
  recommendedQuantity: number;
  currentTier: BulkDiscountTier | null;
  nextTier: BulkDiscountTier;
  quantityToAdd: number;
  additionalCost: number;
  savings: number;
  savingsPercent: number;
  message: string;
}

// Example output
const recommendation: BulkUpsellRecommendation = {
  product: { id: 'prod_signature_blend', name: 'Signature Blend', price: 24.99 },
  currentQuantity: 1,
  recommendedQuantity: 2,
  currentTier: null,
  nextTier: { minQuantity: 2, discountValue: 10, label: 'Buy 2, Save 10%' },
  quantityToAdd: 1,
  additionalCost: 22.49,  // $24.99 - 10% = $22.49 for second bag
  savings: 5.00,          // Total savings with 2 bags
  savingsPercent: 10,
  message: 'Add 1 more bag and save $5.00 (10% off)',
};
```

### Bulk Discount Service

```typescript
// apps/api/src/pricing/services/bulk-discount.service.ts

@Injectable()
export class BulkDiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Get bulk discount configuration for a product
   */
  async getProductBulkDiscount(productId: string): Promise<ProductBulkDiscount | null> {
    const cacheKey = `bulk-discount:${productId}`;
    const cached = await this.cacheManager.get<ProductBulkDiscount>(cacheKey);
    if (cached) return cached;

    const config = await this.prisma.productBulkDiscount.findUnique({
      where: { productId },
    });

    if (config) {
      await this.cacheManager.set(cacheKey, config, 300); // 5 min cache
    }

    return config;
  }

  /**
   * Calculate price for a given quantity
   */
  async calculateBulkPrice(
    productId: string,
    quantity: number,
    basePrice: number,
  ): Promise<BulkPriceResult> {
    const config = await this.getProductBulkDiscount(productId);

    if (!config?.enabled) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        discount: 0,
        tier: null,
      };
    }

    // Find applicable tier
    const tier = config.tiers
      .filter(t => quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity))
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (!tier) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        discount: 0,
        tier: null,
      };
    }

    let unitPrice: number;
    let discount: number;

    switch (tier.discountType) {
      case 'PERCENTAGE':
        unitPrice = basePrice * (1 - tier.discountValue / 100);
        discount = basePrice * quantity * (tier.discountValue / 100);
        break;
      case 'FIXED_AMOUNT':
        unitPrice = basePrice - tier.discountValue;
        discount = tier.discountValue * quantity;
        break;
      case 'UNIT_PRICE':
        unitPrice = tier.discountValue;
        discount = (basePrice - tier.discountValue) * quantity;
        break;
    }

    // Apply max discount cap
    const maxDiscount = basePrice * quantity * (config.maxDiscountPercent / 100);
    discount = Math.min(discount, maxDiscount);

    return {
      unitPrice,
      totalPrice: unitPrice * quantity,
      discount,
      tier,
    };
  }

  /**
   * Get upsell recommendation for bulk purchase
   */
  async getBulkUpsellRecommendation(
    productId: string,
    currentQuantity: number,
  ): Promise<BulkUpsellRecommendation | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) return null;

    const config = await this.getProductBulkDiscount(productId);
    if (!config?.enabled) return null;

    const basePrice = Number(product.price);

    // Find current tier
    const currentTier = config.tiers.find(
      t => currentQuantity >= t.minQuantity && (!t.maxQuantity || currentQuantity <= t.maxQuantity)
    );

    // Find next tier
    const nextTier = config.tiers
      .filter(t => t.minQuantity > currentQuantity)
      .sort((a, b) => a.minQuantity - b.minQuantity)[0];

    if (!nextTier) return null;

    const quantityToAdd = nextTier.minQuantity - currentQuantity;
    const currentTotal = await this.calculateBulkPrice(productId, currentQuantity, basePrice);
    const newTotal = await this.calculateBulkPrice(productId, nextTier.minQuantity, basePrice);

    const additionalCost = newTotal.totalPrice - currentTotal.totalPrice;
    const regularAdditionalCost = basePrice * quantityToAdd;
    const savings = regularAdditionalCost - additionalCost + (newTotal.discount - currentTotal.discount);

    return {
      product,
      currentQuantity,
      recommendedQuantity: nextTier.minQuantity,
      currentTier,
      nextTier,
      quantityToAdd,
      additionalCost,
      savings,
      savingsPercent: nextTier.discountValue,
      message: this.generateBulkUpsellMessage(product.name, quantityToAdd, savings, nextTier),
    };
  }

  /**
   * Generate compelling upsell message
   */
  private generateBulkUpsellMessage(
    productName: string,
    quantityToAdd: number,
    savings: number,
    tier: BulkDiscountTier,
  ): string {
    const templates = [
      `Add ${quantityToAdd} more and save $${savings.toFixed(2)}!`,
      `${tier.label} - Save $${savings.toFixed(2)} today`,
      `Stock up! Get ${tier.discountValue}% off when you buy ${tier.minQuantity}+`,
      `Smart shoppers buy ${tier.minQuantity}+ and save ${tier.discountValue}%`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}
```

### Bulk Discount UI Component

```typescript
// apps/company-portal/src/components/cart/upsell/bulk-discount-upsell.tsx

'use client';

import { useState } from 'react';
import { Plus, TrendingUp, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BulkUpsellRecommendation } from '@/types/upsell';

interface BulkDiscountUpsellProps {
  recommendation: BulkUpsellRecommendation;
  onAccept: (newQuantity: number) => Promise<void>;
  onDecline: () => void;
}

export function BulkDiscountUpsell({
  recommendation,
  onAccept,
  onDecline,
}: BulkDiscountUpsellProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(recommendation.recommendedQuantity);
    } finally {
      setLoading(false);
    }
  };

  const { product, currentQuantity, recommendedQuantity, quantityToAdd, savings, savingsPercent, additionalCost } = recommendation;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-green-500 text-white">
          <Package className="h-4 w-4" />
        </div>
        <span className="font-semibold text-green-800">Bulk Savings Available!</span>
      </div>

      {/* Current vs Recommended */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          <span>You have </span>
          <span className="font-semibold text-gray-900">{currentQuantity}</span>
          <span> in your cart</span>
        </div>
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="font-semibold">Save {savingsPercent}%</span>
        </div>
      </div>

      {/* Savings Visualization */}
      <div className="bg-white rounded-lg p-3 mb-4 border border-green-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Add {quantityToAdd} more {product.name}</span>
          <span className="text-sm font-medium">+${additionalCost.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-green-600">
          <span className="text-sm font-semibold">Your savings</span>
          <span className="text-lg font-bold">-${savings.toFixed(2)}</span>
        </div>
      </div>

      {/* Tier Visualization */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 5, 10].map((qty, i) => (
          <div
            key={qty}
            className={`
              flex-1 h-2 rounded-full
              ${currentQuantity >= qty ? 'bg-green-500' : 'bg-gray-200'}
              ${recommendedQuantity >= qty && currentQuantity < qty ? 'bg-green-300 animate-pulse' : ''}
            `}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white min-h-[44px] touch-manipulation"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add {quantityToAdd} More & Save
        </Button>
        <Button
          variant="ghost"
          onClick={onDecline}
          className="text-gray-500 min-h-[44px] touch-manipulation"
        >
          No thanks
        </Button>
      </div>
    </div>
  );
}
```

---

## 3. Subscription Upsell Engine

### Overview

Convert one-time purchases to recurring subscriptions with intelligent timing and personalized offers.

### Subscription Eligibility

```typescript
interface SubscriptionEligibility {
  eligible: boolean;
  reasons: string[];
  confidence: number;  // 0-1
  recommendedFrequency: SubscriptionFrequency;
  recommendedDiscount: number;
  estimatedLTV: number;
}

enum SubscriptionFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  BIMONTHLY = 'BIMONTHLY',
  QUARTERLY = 'QUARTERLY',
}

interface SubscriptionConfig {
  productId: string;
  enabled: boolean;

  // Discount tiers by frequency
  discountTiers: {
    frequency: SubscriptionFrequency;
    discountPercent: number;
    label: string;
  }[];

  // Eligibility rules
  eligibility: {
    requirePreviousPurchase: boolean;
    minOrderCount: number;
    productCategories: string[];  // Only for consumables, etc.
  };

  // Presentation
  defaultFrequency: SubscriptionFrequency;
  showSavingsCalculator: boolean;
  emphasizeFlexibility: boolean;  // "Cancel anytime"
}

// Example configuration
const coffeeSubscriptionConfig: SubscriptionConfig = {
  productId: 'prod_signature_blend',
  enabled: true,
  discountTiers: [
    { frequency: 'WEEKLY', discountPercent: 25, label: 'Weekly (Best Value!)' },
    { frequency: 'BIWEEKLY', discountPercent: 20, label: 'Every 2 weeks' },
    { frequency: 'MONTHLY', discountPercent: 15, label: 'Monthly' },
    { frequency: 'BIMONTHLY', discountPercent: 12, label: 'Every 2 months' },
    { frequency: 'QUARTERLY', discountPercent: 10, label: 'Quarterly' },
  ],
  eligibility: {
    requirePreviousPurchase: false,
    minOrderCount: 0,
    productCategories: ['coffee', 'consumables'],
  },
  defaultFrequency: 'MONTHLY',
  showSavingsCalculator: true,
  emphasizeFlexibility: true,
};
```

### Subscription Intelligence Service

```typescript
// apps/api/src/subscriptions/services/subscription-intelligence.service.ts

@Injectable()
export class SubscriptionIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /**
   * Determine if customer is a good subscription candidate
   */
  async evaluateSubscriptionEligibility(
    customerId: string | null,
    productId: string,
    companyId: string,
  ): Promise<SubscriptionEligibility> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    const config = await this.getSubscriptionConfig(productId);

    if (!config?.enabled) {
      return { eligible: false, reasons: ['Product not eligible for subscription'], confidence: 1, recommendedFrequency: 'MONTHLY', recommendedDiscount: 0, estimatedLTV: 0 };
    }

    // Check product category
    if (!this.isConsumableProduct(product)) {
      return { eligible: false, reasons: ['Product type not suitable for subscription'], confidence: 0.9, recommendedFrequency: 'MONTHLY', recommendedDiscount: 0, estimatedLTV: 0 };
    }

    const reasons: string[] = [];
    let score = 0;

    // Analyze customer history if available
    if (customerId) {
      const customerData = await this.getCustomerPurchaseData(customerId, productId);

      // Repeat purchase history
      if (customerData.purchaseCount >= 2) {
        reasons.push('Repeat customer');
        score += 0.3;
      }

      // Purchase frequency suggests subscription fit
      if (customerData.avgDaysBetweenPurchases) {
        const frequency = this.mapDaysToFrequency(customerData.avgDaysBetweenPurchases);
        reasons.push(`Purchase pattern suggests ${frequency} subscription`);
        score += 0.2;
      }

      // Customer LTV indicates willingness to commit
      if (customerData.ltv > 200) {
        reasons.push('High-value customer');
        score += 0.2;
      }
    }

    // Product-specific signals
    if (product.category?.isConsumable) {
      reasons.push('Consumable product');
      score += 0.2;
    }

    if (product.subscriptionRate && product.subscriptionRate > 0.15) {
      reasons.push(`${(product.subscriptionRate * 100).toFixed(0)}% of customers subscribe`);
      score += 0.1;
    }

    // Determine recommended frequency
    const recommendedFrequency = customerId
      ? await this.predictOptimalFrequency(customerId, productId)
      : config.defaultFrequency;

    // Get discount for recommended frequency
    const discountTier = config.discountTiers.find(t => t.frequency === recommendedFrequency);

    // Estimate LTV
    const estimatedLTV = this.calculateSubscriptionLTV(
      Number(product.price),
      discountTier?.discountPercent || 15,
      recommendedFrequency,
    );

    return {
      eligible: score >= 0.3,
      reasons,
      confidence: Math.min(score, 1),
      recommendedFrequency,
      recommendedDiscount: discountTier?.discountPercent || 15,
      estimatedLTV,
    };
  }

  /**
   * Predict optimal subscription frequency for a customer
   */
  private async predictOptimalFrequency(
    customerId: string,
    productId: string,
  ): Promise<SubscriptionFrequency> {
    const purchases = await this.prisma.orderItem.findMany({
      where: {
        order: { customerId },
        productId,
      },
      include: { order: true },
      orderBy: { order: { createdAt: 'asc' } },
    });

    if (purchases.length < 2) {
      return 'MONTHLY'; // Default
    }

    // Calculate average days between purchases
    const intervals: number[] = [];
    for (let i = 1; i < purchases.length; i++) {
      const days = Math.round(
        (purchases[i].order.createdAt.getTime() - purchases[i - 1].order.createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      intervals.push(days);
    }

    const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    return this.mapDaysToFrequency(avgDays);
  }

  /**
   * Map average days between purchases to subscription frequency
   */
  private mapDaysToFrequency(avgDays: number): SubscriptionFrequency {
    if (avgDays <= 10) return 'WEEKLY';
    if (avgDays <= 21) return 'BIWEEKLY';
    if (avgDays <= 45) return 'MONTHLY';
    if (avgDays <= 75) return 'BIMONTHLY';
    return 'QUARTERLY';
  }

  /**
   * Calculate estimated LTV for subscription
   */
  private calculateSubscriptionLTV(
    price: number,
    discountPercent: number,
    frequency: SubscriptionFrequency,
  ): number {
    const discountedPrice = price * (1 - discountPercent / 100);
    const ordersPerYear = this.getOrdersPerYear(frequency);
    const avgSubscriptionMonths = 8; // Industry average

    return discountedPrice * ordersPerYear * (avgSubscriptionMonths / 12);
  }

  /**
   * Get orders per year for a frequency
   */
  private getOrdersPerYear(frequency: SubscriptionFrequency): number {
    switch (frequency) {
      case 'WEEKLY': return 52;
      case 'BIWEEKLY': return 26;
      case 'MONTHLY': return 12;
      case 'BIMONTHLY': return 6;
      case 'QUARTERLY': return 4;
    }
  }
}
```

### Subscription Upsell UI Component

```typescript
// apps/company-portal/src/components/cart/upsell/subscription-upsell.tsx

'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, TrendingDown, Calendar, X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionFrequency, SubscriptionEligibility } from '@/types/subscription';

interface SubscriptionUpsellProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
  eligibility: SubscriptionEligibility;
  discountTiers: {
    frequency: SubscriptionFrequency;
    discountPercent: number;
    label: string;
  }[];
  onSubscribe: (frequency: SubscriptionFrequency) => Promise<void>;
  onDecline: () => void;
}

export function SubscriptionUpsell({
  product,
  quantity,
  eligibility,
  discountTiers,
  onSubscribe,
  onDecline,
}: SubscriptionUpsellProps) {
  const [selectedFrequency, setSelectedFrequency] = useState<SubscriptionFrequency>(
    eligibility.recommendedFrequency
  );
  const [loading, setLoading] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  const selectedTier = discountTiers.find(t => t.frequency === selectedFrequency);
  const discountPercent = selectedTier?.discountPercent || 15;

  const savings = useMemo(() => {
    const discountedPrice = product.price * (1 - discountPercent / 100);
    const savingsPerOrder = (product.price - discountedPrice) * quantity;
    const ordersPerYear = getOrdersPerYear(selectedFrequency);
    return {
      perOrder: savingsPerOrder,
      perYear: savingsPerOrder * ordersPerYear,
    };
  }, [product.price, discountPercent, quantity, selectedFrequency]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await onSubscribe(selectedFrequency);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500 text-white">
            <RefreshCw className="h-4 w-4" />
          </div>
          <span className="font-semibold text-purple-800">Subscribe & Save</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700">
          <TrendingDown className="h-3 w-3" />
          <span className="text-sm font-semibold">{discountPercent}% OFF</span>
        </div>
      </div>

      {/* Product Info */}
      <div className="flex gap-3 mb-4">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <p className="font-medium text-gray-900">{product.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 line-through">
              ${product.price.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-purple-600">
              ${(product.price * (1 - discountPercent / 100)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Frequency Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Delivery Frequency
        </label>
        <button
          onClick={() => setShowFrequencyPicker(!showFrequencyPicker)}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span>{selectedTier?.label}</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFrequencyPicker ? 'rotate-180' : ''}`} />
        </button>

        {showFrequencyPicker && (
          <div className="mt-2 rounded-lg border border-purple-200 bg-white overflow-hidden">
            {discountTiers.map((tier) => (
              <button
                key={tier.frequency}
                onClick={() => {
                  setSelectedFrequency(tier.frequency);
                  setShowFrequencyPicker(false);
                }}
                className={`
                  w-full flex items-center justify-between p-3 hover:bg-purple-50 transition-colors
                  ${tier.frequency === selectedFrequency ? 'bg-purple-100' : ''}
                `}
              >
                <span>{tier.label}</span>
                <span className="text-sm font-semibold text-purple-600">
                  Save {tier.discountPercent}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Savings Calculator */}
      <div className="bg-white rounded-lg p-3 mb-4 border border-purple-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">You save per order</span>
          <span className="font-semibold text-green-600">
            ${savings.perOrder.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Yearly savings</span>
          <span className="text-lg font-bold text-green-600">
            ${savings.perYear.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500" />
          <span>Free shipping on all subscription orders</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500" />
          <span>Skip, pause, or cancel anytime</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500" />
          <span>Manage online in seconds</span>
        </div>
      </div>

      {/* Social Proof */}
      {eligibility.reasons.some(r => r.includes('%')) && (
        <div className="flex items-center gap-2 text-sm text-purple-600 mb-4">
          <span className="font-medium">
            {eligibility.reasons.find(r => r.includes('%'))}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleSubscribe}
          disabled={loading}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white min-h-[48px] touch-manipulation"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Subscribe & Save {discountPercent}%
        </Button>
        <Button
          variant="ghost"
          onClick={onDecline}
          className="text-gray-500 min-h-[48px] touch-manipulation"
        >
          One-time
        </Button>
      </div>
    </div>
  );
}

function getOrdersPerYear(frequency: SubscriptionFrequency): number {
  switch (frequency) {
    case 'WEEKLY': return 52;
    case 'BIWEEKLY': return 26;
    case 'MONTHLY': return 12;
    case 'BIMONTHLY': return 6;
    case 'QUARTERLY': return 4;
  }
}
```

---

## 4. AI-Powered Targeting

### Overview

Use customer data, behavior, and AI to determine the best upsell for each customer.

### Customer Segments

```typescript
enum CustomerSegment {
  // Value-based
  BUDGET_CONSCIOUS = 'BUDGET_CONSCIOUS',       // Price sensitive, uses coupons
  VALUE_SEEKER = 'VALUE_SEEKER',               // Wants deals, not cheapest
  PREMIUM_BUYER = 'PREMIUM_BUYER',             // Buys high-end, less price sensitive

  // Behavior-based
  FIRST_TIME_BUYER = 'FIRST_TIME_BUYER',       // New customer
  REPEAT_CUSTOMER = 'REPEAT_CUSTOMER',         // 2+ orders
  LOYAL_SUBSCRIBER = 'LOYAL_SUBSCRIBER',       // Active subscription
  LAPSED_CUSTOMER = 'LAPSED_CUSTOMER',         // No order in 90+ days

  // Intent-based
  BROWSER = 'BROWSER',                         // High browse, low buy
  QUICK_BUYER = 'QUICK_BUYER',                 // Fast decisions
  RESEARCHER = 'RESEARCHER',                   // Compares, reads reviews

  // Cart-based
  SMALL_CART = 'SMALL_CART',                   // < $30
  MEDIUM_CART = 'MEDIUM_CART',                 // $30-$100
  LARGE_CART = 'LARGE_CART',                   // > $100
}
```

### Upsell Targeting Rules

```typescript
interface UpsellTargetingRule {
  id: string;
  name: string;
  priority: number;

  // Conditions
  conditions: {
    segments?: CustomerSegment[];
    cartValueMin?: number;
    cartValueMax?: number;
    productCategories?: string[];
    hasProduct?: string[];
    excludeProduct?: string[];
    isNewCustomer?: boolean;
    hasSubscription?: boolean;
    daysSinceLastOrder?: { min?: number; max?: number };
  };

  // Upsell configuration
  upsellType: UpsellType;
  offer: {
    discountPercent?: number;
    freeShipping?: boolean;
    freeGift?: string;
    bonusProduct?: string;
  };

  // Presentation
  message: string;
  urgency: 'low' | 'medium' | 'high';
  placement: ('CART_DRAWER' | 'CHECKOUT' | 'POST_PURCHASE')[];
}

// Example targeting rules
const targetingRules: UpsellTargetingRule[] = [
  {
    id: 'rule_budget_bulk',
    name: 'Budget Buyers - Bulk Discount',
    priority: 1,
    conditions: {
      segments: ['BUDGET_CONSCIOUS', 'VALUE_SEEKER'],
      cartValueMin: 20,
    },
    upsellType: 'BULK_DISCOUNT',
    offer: { discountPercent: 15 },
    message: 'Smart shoppers save more! Buy 2 and get 15% off.',
    urgency: 'medium',
    placement: ['CART_DRAWER', 'CHECKOUT'],
  },
  {
    id: 'rule_repeat_subscribe',
    name: 'Repeat Customers - Subscription',
    priority: 2,
    conditions: {
      segments: ['REPEAT_CUSTOMER'],
      hasSubscription: false,
      productCategories: ['consumables'],
    },
    upsellType: 'SUBSCRIPTION',
    offer: { discountPercent: 20, freeShipping: true },
    message: 'Never run out! Subscribe and save 20% + free shipping.',
    urgency: 'low',
    placement: ['CART_DRAWER', 'CHECKOUT', 'POST_PURCHASE'],
  },
  {
    id: 'rule_large_cart_protection',
    name: 'Large Cart - Shipping Protection',
    priority: 3,
    conditions: {
      segments: ['LARGE_CART'],
      cartValueMin: 100,
    },
    upsellType: 'SHIPPING_PROTECTION',
    offer: {},
    message: 'Protect your ${{cartValue}} order for just $4.99',
    urgency: 'medium',
    placement: ['CHECKOUT'],
  },
  {
    id: 'rule_first_time_gift',
    name: 'First Time Buyer - Free Gift',
    priority: 4,
    conditions: {
      isNewCustomer: true,
      cartValueMin: 50,
    },
    upsellType: 'FREE_GIFT_THRESHOLD',
    offer: { freeGift: 'sample_pack' },
    message: 'Welcome! Add ${{remaining}} more for a FREE sample pack.',
    urgency: 'high',
    placement: ['CART_DRAWER'],
  },
];
```

### AI Targeting Service

```typescript
// apps/api/src/upsell/services/upsell-targeting.service.ts

@Injectable()
export class UpsellTargetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly segmentService: CustomerSegmentService,
  ) {}

  /**
   * Get personalized upsell recommendations for a cart
   */
  async getTargetedUpsells(
    cartId: string,
    options?: { maxUpsells?: number; placements?: string[] },
  ): Promise<TargetedUpsell[]> {
    const cart = await this.getCartWithContext(cartId);
    const customer = cart.customer;

    // Determine customer segments
    const segments = await this.segmentService.getCustomerSegments(
      customer?.id,
      cart,
    );

    // Get applicable rules
    const rules = await this.getApplicableRules(cart, segments, options?.placements);

    // Score and rank upsells
    const scoredUpsells = await this.scoreUpsells(rules, cart, customer);

    // Apply AI refinement for messaging
    const refinedUpsells = await this.refineWithAI(scoredUpsells, cart, customer);

    return refinedUpsells.slice(0, options?.maxUpsells || 3);
  }

  /**
   * Score upsells based on likelihood of acceptance
   */
  private async scoreUpsells(
    rules: UpsellTargetingRule[],
    cart: CartWithContext,
    customer: Customer | null,
  ): Promise<ScoredUpsell[]> {
    const scoredUpsells: ScoredUpsell[] = [];

    for (const rule of rules) {
      let score = rule.priority * 0.3; // Base score from priority

      // Score based on customer match
      if (customer) {
        // Previous upsell acceptance rate
        const acceptanceRate = await this.getUpsellAcceptanceRate(
          customer.id,
          rule.upsellType,
        );
        score += acceptanceRate * 0.3;

        // Price sensitivity alignment
        if (rule.offer.discountPercent && customer.pricePreference === 'budget') {
          score += 0.2;
        }

        // Purchase history alignment
        if (rule.upsellType === 'SUBSCRIPTION') {
          const repeatPurchaseRate = await this.getRepeatPurchaseRate(customer.id);
          score += repeatPurchaseRate * 0.2;
        }
      }

      // Score based on cart context
      const cartValueScore = this.getCartValueScore(
        Number(cart.grandTotal),
        rule.upsellType,
      );
      score += cartValueScore * 0.2;

      scoredUpsells.push({
        rule,
        score,
        estimatedConversion: this.scoreToConversion(score),
      });
    }

    return scoredUpsells.sort((a, b) => b.score - a.score);
  }

  /**
   * Use AI to refine upsell messaging
   */
  private async refineWithAI(
    upsells: ScoredUpsell[],
    cart: CartWithContext,
    customer: Customer | null,
  ): Promise<TargetedUpsell[]> {
    const refinedUpsells: TargetedUpsell[] = [];

    for (const upsell of upsells) {
      const { rule } = upsell;

      // Generate personalized message
      const prompt = `
        Generate a compelling, concise upsell message for this context:

        Customer: ${customer ? `${customer.firstName}, ${customer.orderCount} orders, $${customer.lifetimeValue} LTV` : 'Guest'}
        Cart: ${cart.items.map(i => i.product.name).join(', ')} - $${cart.grandTotal}
        Upsell Type: ${rule.upsellType}
        Offer: ${JSON.stringify(rule.offer)}
        Base Message: ${rule.message}

        Requirements:
        - Max 15 words
        - Include specific savings or benefit
        - Match urgency level: ${rule.urgency}
        - Be conversational, not salesy

        Return only the message, no quotes.
      `;

      const personalizedMessage = await this.anthropic.complete(
        cart.companyId,
        prompt,
      );

      refinedUpsells.push({
        ...upsell,
        personalizedMessage: personalizedMessage || rule.message,
        products: await this.getUpsellProducts(rule, cart),
      });
    }

    return refinedUpsells;
  }

  /**
   * Get products for an upsell recommendation
   */
  private async getUpsellProducts(
    rule: UpsellTargetingRule,
    cart: CartWithContext,
  ): Promise<Product[]> {
    switch (rule.upsellType) {
      case 'BULK_DISCOUNT':
        // Return same products with quantity suggestion
        return cart.items.map(i => i.product);

      case 'COMPLEMENTARY':
        // Get AI-recommended complementary products
        return this.getComplementaryProducts(cart);

      case 'FREE_SHIPPING_ADD':
        // Get products to reach free shipping threshold
        const gap = await this.getFreeShippingGap(cart);
        return this.getProductsNearPrice(cart.companyId, gap);

      case 'FREE_GIFT_THRESHOLD':
        // Get the free gift product
        if (rule.offer.freeGift) {
          const gift = await this.prisma.product.findFirst({
            where: { sku: rule.offer.freeGift },
          });
          return gift ? [gift] : [];
        }
        return [];

      default:
        return [];
    }
  }
}
```

### A/B Testing for Upsells

```typescript
interface UpsellExperiment {
  id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

  // Variants
  control: UpsellVariant;
  variants: UpsellVariant[];

  // Traffic allocation
  trafficPercent: number;  // % of eligible users in experiment
  variantWeights: number[];  // Distribution across variants

  // Goals
  primaryMetric: 'CONVERSION' | 'REVENUE' | 'AOV';
  minimumSampleSize: number;
  confidenceLevel: number;  // 0.95 = 95%

  // Results
  results?: ExperimentResults;
}

interface UpsellVariant {
  id: string;
  name: string;
  message: string;
  offer: UpsellOffer;
  placement: string;
  design: 'MINIMAL' | 'STANDARD' | 'PROMINENT';
}

// Example experiment
const bulkDiscountExperiment: UpsellExperiment = {
  id: 'exp_bulk_discount_message',
  name: 'Bulk Discount Message Test',
  status: 'RUNNING',
  control: {
    id: 'control',
    name: 'Control',
    message: 'Buy 2, Save 15%',
    offer: { discountPercent: 15 },
    placement: 'CART_DRAWER',
    design: 'STANDARD',
  },
  variants: [
    {
      id: 'variant_a',
      name: 'Savings Focus',
      message: 'Add 1 more and save $7.50 instantly!',
      offer: { discountPercent: 15 },
      placement: 'CART_DRAWER',
      design: 'STANDARD',
    },
    {
      id: 'variant_b',
      name: 'Social Proof',
      message: '73% of customers buy 2+ bags. Save 15%!',
      offer: { discountPercent: 15 },
      placement: 'CART_DRAWER',
      design: 'PROMINENT',
    },
  ],
  trafficPercent: 100,
  variantWeights: [34, 33, 33],
  primaryMetric: 'CONVERSION',
  minimumSampleSize: 1000,
  confidenceLevel: 0.95,
};
```

---

## 5. Product Page Recommendations (Amazon-Style)

### Overview

AI-powered product recommendations on product pages, inspired by Amazon's proven recommendation engine. These leverage MI's behavioral data, purchase history, and collaborative filtering to surface relevant products.

### Recommendation Types

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT PAGE: Signature Blend Coffee                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Product Hero Image]                    [Price, Add to Cart]           │
│  [Product Description]                   [Bulk Discount Option]         │
│                                          [Subscribe & Save Option]      │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════    │
│                                                                          │
│  🛒 CUSTOMERS WHO BOUGHT THIS ALSO BOUGHT                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  Based on purchase patterns from customers who bought Signature Blend    │
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ [IMG]   │  │ [IMG]   │  │ [IMG]   │  │ [IMG]   │  │ [IMG]   │       │
│  │ Coffee  │  │ Filters │  │ Grinder │  │ Mug Set │  │ Creamer │       │
│  │ $18.99  │  │ $8.99   │  │ $49.99  │  │ $24.99  │  │ $12.99  │       │
│  │ ⭐ 4.8  │  │ ⭐ 4.6  │  │ ⭐ 4.9  │  │ ⭐ 4.7  │  │ ⭐ 4.5  │       │
│  │ [Add]   │  │ [Add]   │  │ [Add]   │  │ [Add]   │  │ [Add]   │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                              ◄ ────────────────── ►     │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════    │
│                                                                          │
│  ✨ YOU MIGHT ALSO LIKE                                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  Personalized based on your browsing history and preferences             │
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ [IMG]   │  │ [IMG]   │  │ [IMG]   │  │ [IMG]   │                     │
│  │ Dark    │  │ Espresso│  │ Cold    │  │ Gift    │                     │
│  │ Roast   │  │ Blend   │  │ Brew    │  │ Set     │                     │
│  │ $22.99  │  │ $26.99  │  │ $19.99  │  │ $59.99  │                     │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                     │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════    │
│                                                                          │
│  👀 CUSTOMERS FREQUENTLY VIEWED TOGETHER                                │
│  ─────────────────────────────────────────────────────────────────────  │
│  Products often viewed in the same session                               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  [Signature Blend]  +  [Coffee Grinder]  +  [Filter Set]       │     │
│  │       $24.99              $49.99             $8.99             │     │
│  │  ─────────────────────────────────────────────────────────────│     │
│  │  Buy all 3 together: $75.47 (Save $8.50)     [Add All to Cart]│     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommendation Algorithms

#### 1. Customers Also Bought (Collaborative Filtering)

```typescript
interface AlsoBoughtRecommendation {
  type: 'ALSO_BOUGHT';
  algorithm: 'COLLABORATIVE_FILTERING';

  // How it works:
  // 1. Find all orders containing the current product
  // 2. Extract other products from those orders
  // 3. Rank by co-occurrence frequency
  // 4. Filter out current product and low-stock items
  // 5. Apply business rules (margin, inventory)

  config: {
    minCoOccurrences: number;      // Min times bought together (default: 5)
    lookbackDays: number;          // Order history window (default: 90)
    maxResults: number;            // Products to show (default: 10)
    excludeCategories?: string[];  // Don't recommend from these categories
    boostHighMargin: boolean;      // Prefer higher-margin products
    boostInStock: boolean;         // Prefer well-stocked items
  };
}

// Algorithm implementation
async function getAlsoBoughtProducts(
  productId: string,
  companyId: string,
  config: AlsoBoughtConfig,
): Promise<RecommendedProduct[]> {
  // Step 1: Get all orders containing this product
  const ordersWithProduct = await prisma.orderItem.findMany({
    where: {
      productId,
      order: {
        companyId,
        createdAt: { gte: daysAgo(config.lookbackDays) },
        status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
      },
    },
    select: { orderId: true },
  });

  const orderIds = ordersWithProduct.map(o => o.orderId);

  // Step 2: Get co-purchased products
  const coProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      orderId: { in: orderIds },
      productId: { not: productId },
    },
    _count: { productId: true },
    having: {
      productId: { _count: { gte: config.minCoOccurrences } },
    },
    orderBy: { _count: { productId: 'desc' } },
    take: config.maxResults * 2, // Get extra for filtering
  });

  // Step 3: Enrich with product details and filter
  const enrichedProducts = await enrichAndFilter(coProducts, config);

  // Step 4: Apply scoring
  return scoreAndRank(enrichedProducts, config);
}
```

#### 2. You Might Like (Personalized Recommendations)

```typescript
interface YouMightLikeRecommendation {
  type: 'YOU_MIGHT_LIKE';
  algorithm: 'HYBRID_PERSONALIZED';

  // How it works:
  // 1. Analyze customer's browsing history
  // 2. Analyze customer's purchase history
  // 3. Find similar customers (collaborative)
  // 4. Apply content-based filtering (similar products)
  // 5. Blend signals with ML model or weighted average

  config: {
    browsingWeight: number;        // Weight for browsing behavior (0-1)
    purchaseWeight: number;        // Weight for purchase history (0-1)
    similarCustomerWeight: number; // Weight for similar customers (0-1)
    contentWeight: number;         // Weight for product similarity (0-1)
    maxResults: number;
    excludeRecentlyViewed: boolean;
    excludeRecentlyPurchased: boolean;
    diversityFactor: number;       // 0-1, higher = more diverse categories
  };
}

// Personalization signals
interface CustomerSignals {
  // Browsing behavior
  viewedProducts: { productId: string; viewCount: number; lastViewed: Date }[];
  viewedCategories: { categoryId: string; viewCount: number }[];
  searchTerms: string[];
  avgTimeOnProduct: number;

  // Purchase behavior
  purchasedProducts: { productId: string; purchaseCount: number; lastPurchased: Date }[];
  purchasedCategories: { categoryId: string; purchaseCount: number }[];
  avgOrderValue: number;
  pricePreference: 'budget' | 'mid' | 'premium';

  // Engagement
  wishlistItems: string[];
  cartAbandons: string[];
  reviewedProducts: string[];
}

async function getYouMightLikeProducts(
  customerId: string | null,
  sessionId: string,
  currentProductId: string,
  companyId: string,
  config: YouMightLikeConfig,
): Promise<RecommendedProduct[]> {
  // Get customer signals (from customer or session)
  const signals = await getCustomerSignals(customerId, sessionId);

  // Score each candidate product
  const candidates = await getCandidateProducts(companyId, currentProductId);

  const scoredProducts = await Promise.all(
    candidates.map(async (product) => {
      let score = 0;

      // Browsing affinity
      const browsingScore = calculateBrowsingAffinity(signals, product);
      score += browsingScore * config.browsingWeight;

      // Purchase affinity
      const purchaseScore = calculatePurchaseAffinity(signals, product);
      score += purchaseScore * config.purchaseWeight;

      // Similar customers who bought this
      const collabScore = await calculateCollaborativeScore(customerId, product);
      score += collabScore * config.similarCustomerWeight;

      // Content similarity to viewed/purchased products
      const contentScore = calculateContentSimilarity(signals, product);
      score += contentScore * config.contentWeight;

      return { product, score };
    })
  );

  // Apply diversity (don't show all from same category)
  return applyDiversityAndRank(scoredProducts, config);
}
```

#### 3. Frequently Viewed Together (Session-Based)

```typescript
interface FrequentlyViewedRecommendation {
  type: 'FREQUENTLY_VIEWED';
  algorithm: 'SESSION_ANALYSIS';

  // How it works:
  // 1. Analyze viewing sessions containing this product
  // 2. Find products commonly viewed in same session
  // 3. Identify "bundle" patterns (viewed in sequence)
  // 4. Calculate optimal bundle with discount

  config: {
    minSessionCoViews: number;     // Min sessions with co-view (default: 10)
    sessionWindowMinutes: number;  // Session definition (default: 30)
    lookbackDays: number;
    maxBundleSize: number;         // Max products in bundle (default: 3)
    bundleDiscountPercent: number; // Discount for buying all (default: 10)
  };
}

interface ViewedTogetherBundle {
  products: Product[];
  coViewFrequency: number;        // How often viewed together
  conversionLift: number;         // % more likely to convert when bundled
  individualTotal: number;
  bundlePrice: number;
  savings: number;
}

async function getFrequentlyViewedProducts(
  productId: string,
  companyId: string,
  config: FrequentlyViewedConfig,
): Promise<ViewedTogetherBundle[]> {
  // Get sessions where this product was viewed
  const sessions = await prisma.productView.findMany({
    where: {
      productId,
      companyId,
      viewedAt: { gte: daysAgo(config.lookbackDays) },
    },
    select: { sessionId: true, viewedAt: true },
  });

  const sessionIds = [...new Set(sessions.map(s => s.sessionId))];

  // Find co-viewed products in those sessions
  const coViews = await prisma.productView.groupBy({
    by: ['productId'],
    where: {
      sessionId: { in: sessionIds },
      productId: { not: productId },
    },
    _count: { sessionId: true },
    having: {
      sessionId: { _count: { gte: config.minSessionCoViews } },
    },
    orderBy: { _count: { sessionId: 'desc' } },
  });

  // Identify bundle combinations
  const bundles = await identifyBundles(productId, coViews, config);

  // Calculate bundle pricing
  return bundles.map(bundle => ({
    ...bundle,
    bundlePrice: calculateBundlePrice(bundle, config.bundleDiscountPercent),
    savings: calculateSavings(bundle, config.bundleDiscountPercent),
  }));
}
```

### Product Recommendation Service

```typescript
// apps/api/src/recommendations/services/product-recommendation.service.ts

@Injectable()
export class ProductRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Get all recommendation sections for a product page
   */
  async getProductPageRecommendations(
    productId: string,
    companyId: string,
    customerId?: string,
    sessionId?: string,
  ): Promise<ProductPageRecommendations> {
    const config = await this.getRecommendationConfig(companyId);

    const recommendations: ProductPageRecommendations = {
      alsoBought: null,
      youMightLike: null,
      frequentlyViewed: null,
    };

    // Parallel fetch all enabled recommendation types
    const promises: Promise<void>[] = [];

    if (config.alsoBought.enabled) {
      promises.push(
        this.getAlsoBoughtRecommendations(productId, companyId, config.alsoBought)
          .then(r => { recommendations.alsoBought = r; })
      );
    }

    if (config.youMightLike.enabled) {
      promises.push(
        this.getYouMightLikeRecommendations(
          productId, companyId, customerId, sessionId, config.youMightLike
        ).then(r => { recommendations.youMightLike = r; })
      );
    }

    if (config.frequentlyViewed.enabled) {
      promises.push(
        this.getFrequentlyViewedRecommendations(productId, companyId, config.frequentlyViewed)
          .then(r => { recommendations.frequentlyViewed = r; })
      );
    }

    await Promise.all(promises);

    // Track recommendation impressions
    await this.trackRecommendationImpressions(
      productId, recommendations, customerId, sessionId
    );

    return recommendations;
  }

  /**
   * Get "Customers Also Bought" recommendations
   */
  async getAlsoBoughtRecommendations(
    productId: string,
    companyId: string,
    config: AlsoBoughtConfig,
  ): Promise<RecommendationSection> {
    const cacheKey = `also-bought:${productId}:${companyId}`;
    const cached = await this.cacheManager.get<RecommendationSection>(cacheKey);
    if (cached) return cached;

    // Get co-purchased products
    const coProducts = await this.getCoProductsFromOrders(productId, companyId, config);

    // Enrich with product details
    const products = await this.enrichProducts(coProducts, companyId);

    // Apply AI ranking if enabled
    const rankedProducts = config.useAIRanking
      ? await this.aiRankProducts(products, productId, 'also_bought')
      : products;

    const section: RecommendationSection = {
      type: 'ALSO_BOUGHT',
      title: 'Customers Who Bought This Also Bought',
      subtitle: `Based on ${coProducts.length > 100 ? '100+' : coProducts.length} orders`,
      products: rankedProducts.slice(0, config.maxResults),
      displayStyle: config.displayStyle || 'CAROUSEL',
    };

    await this.cacheManager.set(cacheKey, section, 3600); // 1 hour cache

    return section;
  }

  /**
   * Get "You Might Like" personalized recommendations
   */
  async getYouMightLikeRecommendations(
    productId: string,
    companyId: string,
    customerId: string | undefined,
    sessionId: string | undefined,
    config: YouMightLikeConfig,
  ): Promise<RecommendationSection> {
    // This is personalized, so limited caching
    const cacheKey = customerId
      ? `you-might-like:${productId}:${customerId}`
      : `you-might-like:${productId}:${sessionId}`;

    const cached = await this.cacheManager.get<RecommendationSection>(cacheKey);
    if (cached) return cached;

    // Get customer signals
    const signals = await this.getCustomerSignals(customerId, sessionId, companyId);

    // Get candidate products
    const candidates = await this.getCandidateProducts(productId, companyId, config);

    // Score each product
    const scored = await this.scoreProductsForCustomer(candidates, signals, config);

    // Apply diversity
    const diversified = this.applyDiversity(scored, config.diversityFactor);

    const section: RecommendationSection = {
      type: 'YOU_MIGHT_LIKE',
      title: customerId ? 'Recommended For You' : 'You Might Also Like',
      subtitle: customerId
        ? 'Based on your shopping history'
        : 'Based on similar products',
      products: diversified.slice(0, config.maxResults),
      displayStyle: config.displayStyle || 'GRID',
      personalized: !!customerId,
    };

    // Short cache for personalized
    await this.cacheManager.set(cacheKey, section, customerId ? 300 : 1800);

    return section;
  }

  /**
   * Get "Frequently Viewed Together" bundle recommendations
   */
  async getFrequentlyViewedRecommendations(
    productId: string,
    companyId: string,
    config: FrequentlyViewedConfig,
  ): Promise<FrequentlyViewedSection> {
    const cacheKey = `frequently-viewed:${productId}:${companyId}`;
    const cached = await this.cacheManager.get<FrequentlyViewedSection>(cacheKey);
    if (cached) return cached;

    // Analyze viewing sessions
    const coViewedProducts = await this.getCoViewedProducts(productId, companyId, config);

    // Build optimal bundles
    const bundles = await this.buildBundles(productId, coViewedProducts, config);

    // Get the current product
    const currentProduct = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    const section: FrequentlyViewedSection = {
      type: 'FREQUENTLY_VIEWED',
      title: 'Frequently Viewed Together',
      subtitle: 'Products often explored in the same session',
      currentProduct,
      bundles: bundles.slice(0, 3), // Top 3 bundles
      displayStyle: 'BUNDLE_CARDS',
    };

    await this.cacheManager.set(cacheKey, section, 3600);

    return section;
  }

  /**
   * AI-powered product ranking
   */
  private async aiRankProducts(
    products: Product[],
    currentProductId: string,
    context: string,
  ): Promise<Product[]> {
    if (products.length <= 3) return products;

    const currentProduct = await this.prisma.product.findUnique({
      where: { id: currentProductId },
      include: { category: true },
    });

    const prompt = `
      Given a customer viewing: "${currentProduct.name}" (${currentProduct.category?.name})

      Rank these ${context === 'also_bought' ? 'frequently co-purchased' : 'related'} products
      by relevance and likelihood to add to cart:

      ${products.map((p, i) => `${i + 1}. ${p.name} ($${p.price}) - ${p.category?.name || 'Uncategorized'}`).join('\n')}

      Return the numbers in order of relevance, comma-separated. Example: "3, 1, 5, 2, 4"
      Consider: complementary use cases, price similarity, category relationship.
    `;

    try {
      const response = await this.anthropic.complete(currentProduct.companyId, prompt);
      const ranking = response.split(',').map(n => parseInt(n.trim()) - 1);

      return ranking
        .filter(i => i >= 0 && i < products.length)
        .map(i => products[i]);
    } catch {
      return products; // Fallback to original order
    }
  }
}
```

### Configuration Model

```typescript
interface ProductRecommendationConfig {
  companyId: string;

  // "Customers Also Bought" settings
  alsoBought: {
    enabled: boolean;
    title: string;                    // Custom title
    minCoOccurrences: number;         // Default: 5
    lookbackDays: number;             // Default: 90
    maxResults: number;               // Default: 10
    displayStyle: 'CAROUSEL' | 'GRID';
    useAIRanking: boolean;            // Use Claude to rank results
    excludeCategories: string[];
    boostHighMargin: boolean;
    showRatings: boolean;
    showQuickAdd: boolean;
  };

  // "You Might Like" settings
  youMightLike: {
    enabled: boolean;
    title: string;
    titleForGuests: string;           // Different title for non-logged-in
    maxResults: number;
    displayStyle: 'CAROUSEL' | 'GRID';
    browsingWeight: number;           // 0-1
    purchaseWeight: number;           // 0-1
    contentWeight: number;            // 0-1
    diversityFactor: number;          // 0-1
    excludeRecentlyViewed: boolean;
    excludePurchased: boolean;
    showPersonalizationBadge: boolean; // "For You" badge
  };

  // "Frequently Viewed Together" settings
  frequentlyViewed: {
    enabled: boolean;
    title: string;
    minSessionCoViews: number;        // Default: 10
    lookbackDays: number;
    maxBundleSize: number;            // Default: 3
    bundleDiscountPercent: number;    // Default: 10
    showBundleSavings: boolean;
    showAddAllButton: boolean;
    displayStyle: 'BUNDLE_CARDS' | 'COMPACT';
  };

  // Global settings
  global: {
    maxSectionsPerPage: number;       // Default: 3
    respectInventory: boolean;        // Hide out-of-stock
    minRatingToShow: number;          // Default: 0 (show all)
    trackImpressions: boolean;
    trackClicks: boolean;
  };
}
```

### React Components

#### Recommendation Section Container

```typescript
// apps/company-portal/src/components/product/recommendations/recommendation-section.tsx

'use client';

import { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './product-card';
import { RecommendationSection as SectionType } from '@/types/recommendations';

interface RecommendationSectionProps {
  section: SectionType;
  onProductClick: (productId: string) => void;
  onAddToCart: (productId: string) => Promise<void>;
}

export function RecommendationSection({
  section,
  onProductClick,
  onAddToCart,
}: RecommendationSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track section impression
  useEffect(() => {
    trackRecommendationImpression(section.type, section.products.map(p => p.id));
  }, [section]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-8 border-t">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-gray-500 mt-1">{section.subtitle}</p>
          )}
        </div>

        {/* Carousel controls */}
        {section.displayStyle === 'CAROUSEL' && section.products.length > 4 && (
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Products */}
      {section.displayStyle === 'CAROUSEL' ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        >
          {section.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => onProductClick(product.id)}
              onAddToCart={() => onAddToCart(product.id)}
              showQuickAdd
              className="flex-shrink-0 w-[200px]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {section.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => onProductClick(product.id)}
              onAddToCart={() => onAddToCart(product.id)}
              showQuickAdd
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

#### Frequently Viewed Bundle Component

```typescript
// apps/company-portal/src/components/product/recommendations/frequently-viewed-bundle.tsx

'use client';

import { useState } from 'react';
import { Plus, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FrequentlyViewedSection, ViewedTogetherBundle } from '@/types/recommendations';

interface FrequentlyViewedBundleProps {
  section: FrequentlyViewedSection;
  onAddBundle: (productIds: string[]) => Promise<void>;
  onAddSingle: (productId: string) => Promise<void>;
}

export function FrequentlyViewedBundle({
  section,
  onAddBundle,
  onAddSingle,
}: FrequentlyViewedBundleProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set([section.currentProduct.id])
  );
  const [loading, setLoading] = useState(false);

  const bundle = section.bundles[0]; // Primary bundle
  if (!bundle) return null;

  const allProducts = [section.currentProduct, ...bundle.products];

  const toggleProduct = (productId: string) => {
    // Current product is always selected
    if (productId === section.currentProduct.id) return;

    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const calculateTotal = () => {
    return allProducts
      .filter(p => selectedProducts.has(p.id))
      .reduce((sum, p) => sum + Number(p.price), 0);
  };

  const calculateSavings = () => {
    if (selectedProducts.size < 2) return 0;
    const total = calculateTotal();
    return total * (bundle.discountPercent / 100);
  };

  const handleAddSelected = async () => {
    setLoading(true);
    try {
      const productIds = Array.from(selectedProducts);
      await onAddBundle(productIds);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  return (
    <section className="py-8 border-t">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {section.title}
      </h2>
      <p className="text-sm text-gray-500 mb-6">{section.subtitle}</p>

      {/* Bundle visualization */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          {allProducts.map((product, index) => (
            <div key={product.id} className="flex items-center gap-4">
              {/* Product card */}
              <button
                onClick={() => toggleProduct(product.id)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${selectedProducts.has(product.id)
                    ? 'border-primary bg-white shadow-md'
                    : 'border-gray-200 bg-white opacity-60 hover:opacity-100'
                  }
                  ${product.id === section.currentProduct.id ? 'ring-2 ring-primary ring-offset-2' : ''}
                `}
              >
                {/* Selection indicator */}
                <div
                  className={`
                    absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center
                    ${selectedProducts.has(product.id) ? 'bg-primary text-white' : 'bg-gray-200'}
                  `}
                >
                  {selectedProducts.has(product.id) && <Check className="h-4 w-4" />}
                </div>

                <img
                  src={product.images[0] || '/placeholder.svg'}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg mb-2"
                />
                <p className="text-sm font-medium text-gray-900 truncate max-w-[100px]">
                  {product.name}
                </p>
                <p className="text-sm text-gray-600">
                  {formatPrice(Number(product.price))}
                </p>

                {product.id === section.currentProduct.id && (
                  <span className="text-xs text-primary font-medium">This item</span>
                )}
              </button>

              {/* Plus sign between products */}
              {index < allProducts.length - 1 && (
                <Plus className="h-6 w-6 text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">
                {selectedProducts.size} items selected
              </p>
              {selectedProducts.size >= 2 && (
                <p className="text-green-600 font-medium">
                  Save {formatPrice(calculateSavings())} with bundle!
                </p>
              )}
            </div>
            <div className="text-right">
              {selectedProducts.size >= 2 && (
                <p className="text-sm text-gray-500 line-through">
                  {formatPrice(calculateTotal())}
                </p>
              )}
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(calculateTotal() - calculateSavings())}
              </p>
            </div>
          </div>

          <Button
            onClick={handleAddSelected}
            disabled={loading || selectedProducts.size < 1}
            className="w-full min-h-[48px] touch-manipulation"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {selectedProducts.size >= 2
              ? `Add ${selectedProducts.size} Items to Cart`
              : 'Add to Cart'
            }
          </Button>
        </div>
      </div>
    </section>
  );
}
```

### Admin Configuration UI

```typescript
// apps/admin-dashboard/src/app/(dashboard)/settings/recommendations/page.tsx

// Admin can configure:
// 1. Enable/disable each recommendation type
// 2. Customize titles and subtitles
// 3. Set algorithm parameters (lookback days, min occurrences, etc.)
// 4. Configure display styles (carousel vs grid)
// 5. Set bundle discount percentages
// 6. Preview recommendations for any product
```

### API Endpoints

```
# Get recommendations for product page
GET    /api/products/:productId/recommendations
       Query: { customerId?, sessionId?, sections? }
       Response: ProductPageRecommendations

# Get specific recommendation type
GET    /api/products/:productId/recommendations/also-bought
GET    /api/products/:productId/recommendations/you-might-like
GET    /api/products/:productId/recommendations/frequently-viewed

# Track interactions
POST   /api/recommendations/impression
       Body: { type, productId, recommendedProductIds, sessionId }

POST   /api/recommendations/click
       Body: { type, productId, clickedProductId, sessionId }

# Admin: Configuration
GET    /api/admin/recommendations/config
PUT    /api/admin/recommendations/config

# Admin: Preview recommendations
GET    /api/admin/recommendations/preview/:productId
```

### Database Schema Additions

```prisma
// Product view tracking for recommendations
model ProductView {
  id          String   @id @default(cuid())
  productId   String
  companyId   String
  sessionId   String
  customerId  String?

  viewedAt    DateTime @default(now())
  duration    Int?     // Seconds on page

  source      String?  // 'DIRECT', 'RECOMMENDATION', 'SEARCH'
  sourceProductId String? // If came from recommendation

  product     Product  @relation(fields: [productId], references: [id])
  company     Company  @relation(fields: [companyId], references: [id])
  customer    Customer? @relation(fields: [customerId], references: [id])

  @@index([productId, viewedAt])
  @@index([sessionId, viewedAt])
  @@index([companyId, viewedAt])
  @@map("product_views")
}

// Recommendation configuration
model RecommendationConfig {
  id          String   @id @default(cuid())
  companyId   String   @unique

  alsoBought  Json     // AlsoBoughtConfig
  youMightLike Json    // YouMightLikeConfig
  frequentlyViewed Json // FrequentlyViewedConfig
  global      Json     // GlobalConfig

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])

  @@map("recommendation_configs")
}

// Recommendation performance tracking
model RecommendationImpression {
  id              String   @id @default(cuid())
  companyId       String
  productId       String   // Product being viewed
  type            String   // ALSO_BOUGHT, YOU_MIGHT_LIKE, FREQUENTLY_VIEWED
  sessionId       String
  customerId      String?

  recommendedIds  String[] // Products shown
  impressedAt     DateTime @default(now())

  clickedProductId String? // Which was clicked
  clickedAt        DateTime?
  addedToCart      Boolean @default(false)
  addedAt          DateTime?

  company         Company  @relation(fields: [companyId], references: [id])
  product         Product  @relation(fields: [productId], references: [id])

  @@index([companyId, type, impressedAt])
  @@index([productId, type])
  @@map("recommendation_impressions")
}
```

---

## 6. Upsell Placements

### Placement Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UPSELL PLACEMENT MAP                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PRODUCT PAGE                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ [Quantity Selector]                                         ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ 💰 Buy 2+, Save 15%              [BULK_DISCOUNT inline]    ││    │
│  │  │ 🔄 Subscribe & Save 20%          [SUBSCRIPTION inline]     ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                               │                                          │
│                               ▼ Add to Cart                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CART DRAWER                                   │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ [Cart Items]                                                ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ 🎁 Add $12 for FREE shipping     [FREE_SHIPPING_ADD]       ││    │
│  │  │ 📦 Add 1 more, save $5           [BULK_DISCOUNT]           ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ 🛒 Complete your order:          [COMPLEMENTARY carousel]  ││    │
│  │  │ [Prod1] [Prod2] [Prod3]                                    ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ [Checkout Button]                                           ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                               │                                          │
│                               ▼ Proceed to Checkout                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CHECKOUT PAGE                                 │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ [Order Summary]                                             ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ 🔄 Convert to subscription       [SUBSCRIPTION sticky]     ││    │
│  │  │ 🛡️ Protect your order $4.99     [SHIPPING_PROTECTION]     ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ [Payment Form]                                              ││    │
│  │  │ [Complete Order Button]                                     ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                               │                                          │
│                               ▼ Order Placed                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    THANK YOU PAGE                                │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│    │
│  │  │ ✅ Order Confirmed!                                         ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ ⚡ Add to your order (ships together!)                      ││    │
│  │  │    [Complementary Product] - $14.99  [Add Now]             ││    │
│  │  │ ───────────────────────────────────────────────────────────││    │
│  │  │ 🔄 Never run out again - Subscribe & Save 20%              ││    │
│  │  │    [Convert to Subscription]                                ││    │
│  │  └─────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Placement Configuration

```typescript
interface UpsellPlacementConfig {
  placement: UpsellPlacement;
  enabled: boolean;
  maxUpsells: number;
  allowedTypes: UpsellType[];
  displayStyle: 'INLINE' | 'MODAL' | 'BANNER' | 'SIDEBAR' | 'CAROUSEL';
  timing?: {
    delay?: number;  // ms before showing
    trigger?: 'IMMEDIATE' | 'SCROLL' | 'EXIT_INTENT' | 'IDLE';
  };
}

const placementConfigs: UpsellPlacementConfig[] = [
  {
    placement: 'PRODUCT_PAGE',
    enabled: true,
    maxUpsells: 2,
    allowedTypes: ['BULK_DISCOUNT', 'SUBSCRIPTION'],
    displayStyle: 'INLINE',
  },
  {
    placement: 'CART_DRAWER',
    enabled: true,
    maxUpsells: 3,
    allowedTypes: ['FREE_SHIPPING_ADD', 'BULK_DISCOUNT', 'COMPLEMENTARY'],
    displayStyle: 'INLINE',
  },
  {
    placement: 'CHECKOUT',
    enabled: true,
    maxUpsells: 2,
    allowedTypes: ['SUBSCRIPTION', 'SHIPPING_PROTECTION', 'WARRANTY'],
    displayStyle: 'SIDEBAR',
  },
  {
    placement: 'POST_PURCHASE',
    enabled: true,
    maxUpsells: 2,
    allowedTypes: ['COMPLEMENTARY', 'SUBSCRIPTION'],
    displayStyle: 'BANNER',
    timing: {
      delay: 0,
      trigger: 'IMMEDIATE',
    },
  },
  {
    placement: 'EXIT_INTENT',
    enabled: true,
    maxUpsells: 1,
    allowedTypes: ['BULK_DISCOUNT', 'FREE_SHIPPING_ADD'],
    displayStyle: 'MODAL',
    timing: {
      trigger: 'EXIT_INTENT',
    },
  },
];
```

---

## 6. UI/UX Design

### Design System

```typescript
// Upsell design tokens
const upsellDesign = {
  // Colors by upsell type
  colors: {
    BULK_DISCOUNT: {
      background: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      accent: 'bg-green-500',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-700',
    },
    SUBSCRIPTION: {
      background: 'from-purple-50 to-indigo-50',
      border: 'border-purple-200',
      accent: 'bg-purple-500',
      text: 'text-purple-800',
      badge: 'bg-purple-100 text-purple-700',
    },
    FREE_SHIPPING: {
      background: 'from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      accent: 'bg-blue-500',
      text: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-700',
    },
    COMPLEMENTARY: {
      background: 'from-orange-50 to-amber-50',
      border: 'border-orange-200',
      accent: 'bg-orange-500',
      text: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-700',
    },
    PROTECTION: {
      background: 'from-slate-50 to-gray-50',
      border: 'border-slate-200',
      accent: 'bg-slate-600',
      text: 'text-slate-800',
      badge: 'bg-slate-100 text-slate-700',
    },
  },

  // Icons by type
  icons: {
    BULK_DISCOUNT: 'Package',
    SUBSCRIPTION: 'RefreshCw',
    FREE_SHIPPING: 'Truck',
    COMPLEMENTARY: 'Sparkles',
    PROTECTION: 'Shield',
    FREE_GIFT: 'Gift',
  },

  // Urgency indicators
  urgency: {
    low: { animation: 'none', badge: null },
    medium: { animation: 'animate-pulse', badge: 'Popular' },
    high: { animation: 'animate-bounce', badge: 'Limited Time!' },
  },
};
```

### Responsive Behavior

```typescript
// Mobile-first upsell display
const responsiveConfig = {
  mobile: {
    maxVisibleUpsells: 1,
    displayStyle: 'STACKED',
    carouselEnabled: true,
    compactMode: true,
  },
  tablet: {
    maxVisibleUpsells: 2,
    displayStyle: 'SIDE_BY_SIDE',
    carouselEnabled: true,
    compactMode: false,
  },
  desktop: {
    maxVisibleUpsells: 3,
    displayStyle: 'GRID',
    carouselEnabled: false,
    compactMode: false,
  },
};
```

---

## 7. Database Schema

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// BULK DISCOUNT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

model ProductBulkDiscount {
  id          String   @id @default(cuid())
  productId   String   @unique
  companyId   String

  enabled     Boolean  @default(true)
  tiers       Json     // BulkDiscountTier[]

  stackWithOtherDiscounts Boolean @default(false)
  maxDiscountPercent      Int     @default(30)

  validFrom   DateTime?
  validUntil  DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product     Product  @relation(fields: [productId], references: [id])
  company     Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, enabled])
  @@map("product_bulk_discounts")
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

model ProductSubscriptionConfig {
  id          String   @id @default(cuid())
  productId   String   @unique
  companyId   String

  enabled     Boolean  @default(true)
  discountTiers Json   // { frequency, discountPercent, label }[]

  defaultFrequency    SubscriptionFrequency @default(MONTHLY)
  freeShippingIncluded Boolean @default(true)

  eligibility Json     // Eligibility rules

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product     Product  @relation(fields: [productId], references: [id])
  company     Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, enabled])
  @@map("product_subscription_configs")
}

enum SubscriptionFrequency {
  WEEKLY
  BIWEEKLY
  MONTHLY
  BIMONTHLY
  QUARTERLY
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPSELL TARGETING RULES
// ═══════════════════════════════════════════════════════════════════════════════

model UpsellTargetingRule {
  id          String   @id @default(cuid())
  companyId   String

  name        String
  description String?
  priority    Int      @default(100)
  enabled     Boolean  @default(true)

  conditions  Json     // UpsellConditions
  upsellType  UpsellType
  offer       Json     // UpsellOffer

  message     String
  urgency     UpsellUrgency @default(MEDIUM)
  placements  String[]

  // Limits
  maxImpressions      Int?     // Per customer per day
  maxAcceptances      Int?     // Total acceptances before disable

  validFrom   DateTime?
  validUntil  DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])
  impressions UpsellImpression[]

  @@index([companyId, enabled, priority])
  @@map("upsell_targeting_rules")
}

enum UpsellType {
  BULK_DISCOUNT
  SUBSCRIPTION
  FREE_SHIPPING_ADD
  FREE_GIFT_THRESHOLD
  COMPLEMENTARY
  BUNDLE_UPGRADE
  PREMIUM_VERSION
  SHIPPING_PROTECTION
  WARRANTY
  QUANTITY_DISCOUNT
}

enum UpsellUrgency {
  LOW
  MEDIUM
  HIGH
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPSELL TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

model UpsellImpression {
  id          String   @id @default(cuid())
  cartId      String
  ruleId      String
  customerId  String?
  sessionId   String

  placement   String
  variant     String?  // For A/B testing

  impressedAt DateTime @default(now())
  viewedAt    DateTime?  // Visible for 1+ second
  clickedAt   DateTime?
  acceptedAt  DateTime?
  declinedAt  DateTime?

  offer       Json     // Offer shown
  revenue     Decimal? @db.Decimal(10, 2) // If accepted

  cart        Cart     @relation(fields: [cartId], references: [id])
  rule        UpsellTargetingRule @relation(fields: [ruleId], references: [id])
  customer    Customer? @relation(fields: [customerId], references: [id])

  @@index([cartId])
  @@index([ruleId, impressedAt])
  @@index([customerId, impressedAt])
  @@map("upsell_impressions")
}

// ═══════════════════════════════════════════════════════════════════════════════
// A/B TESTING
// ═══════════════════════════════════════════════════════════════════════════════

model UpsellExperiment {
  id          String   @id @default(cuid())
  companyId   String

  name        String
  description String?
  status      ExperimentStatus @default(DRAFT)

  control     Json     // UpsellVariant
  variants    Json     // UpsellVariant[]

  trafficPercent  Int  @default(100)
  variantWeights  Int[]

  primaryMetric       String @default("CONVERSION")
  minimumSampleSize   Int    @default(1000)
  confidenceLevel     Float  @default(0.95)

  startedAt   DateTime?
  endedAt     DateTime?

  results     Json?    // ExperimentResults

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, status])
  @@map("upsell_experiments")
}

enum ExperimentStatus {
  DRAFT
  RUNNING
  PAUSED
  COMPLETED
}
```

---

## 8. API Design

### Bulk Discount Endpoints

```
# Configuration
GET    /api/products/:productId/bulk-discount
       Response: ProductBulkDiscount

PUT    /api/products/:productId/bulk-discount
       Body: ProductBulkDiscountInput
       Response: ProductBulkDiscount

DELETE /api/products/:productId/bulk-discount
       Response: { success: boolean }

# Calculation
POST   /api/pricing/bulk-calculate
       Body: { productId, quantity }
       Response: BulkPriceResult

# Recommendations
GET    /api/cart/:cartId/bulk-upsells
       Response: BulkUpsellRecommendation[]
```

### Subscription Upsell Endpoints

```
# Configuration
GET    /api/products/:productId/subscription-config
       Response: ProductSubscriptionConfig

PUT    /api/products/:productId/subscription-config
       Body: ProductSubscriptionConfigInput
       Response: ProductSubscriptionConfig

# Eligibility
GET    /api/cart/:cartId/subscription-eligibility
       Response: SubscriptionEligibility[]

# Convert
POST   /api/cart/:cartId/convert-to-subscription
       Body: { itemId, frequency }
       Response: { success: boolean, subscription: Subscription }
```

### Targeting Endpoints

```
# Rules
GET    /api/upsell/rules
       Query: { enabled?, type?, placement? }
       Response: UpsellTargetingRule[]

POST   /api/upsell/rules
       Body: UpsellTargetingRuleInput
       Response: UpsellTargetingRule

PUT    /api/upsell/rules/:ruleId
       Body: UpsellTargetingRuleInput
       Response: UpsellTargetingRule

DELETE /api/upsell/rules/:ruleId
       Response: { success: boolean }

# Targeting
GET    /api/cart/:cartId/targeted-upsells
       Query: { placement?, maxUpsells? }
       Response: TargetedUpsell[]
```

### Tracking Endpoints

```
# Impressions
POST   /api/upsell/impression
       Body: { cartId, ruleId, placement, variant? }
       Response: UpsellImpression

POST   /api/upsell/impression/:impressionId/view
       Response: { success: boolean }

POST   /api/upsell/impression/:impressionId/click
       Response: { success: boolean }

POST   /api/upsell/impression/:impressionId/accept
       Response: { success: boolean }

POST   /api/upsell/impression/:impressionId/decline
       Response: { success: boolean }
```

### Analytics Endpoints

```
GET    /api/upsell/analytics/overview
       Query: { startDate, endDate }
       Response: UpsellAnalyticsOverview

GET    /api/upsell/analytics/by-type
       Query: { startDate, endDate }
       Response: UpsellTypeMetrics[]

GET    /api/upsell/analytics/by-rule
       Query: { startDate, endDate }
       Response: UpsellRuleMetrics[]

GET    /api/upsell/analytics/by-placement
       Query: { startDate, endDate }
       Response: UpsellPlacementMetrics[]
```

---

## 10. Implementation

### Phase 1: Foundation (Week 1)

| Task | Deliverable |
|------|-------------|
| Define TypeScript types | `types/upsell.ts`, `types/recommendations.ts` |
| Create Prisma models | Migration for all new tables |
| Implement BulkDiscountService | Backend service |
| Create bulk discount UI component | React component |
| Unit tests | 80% coverage |

### Phase 2: Subscription Engine (Week 2)

| Task | Deliverable |
|------|-------------|
| Implement SubscriptionIntelligenceService | Backend service |
| Create subscription eligibility logic | Algorithm |
| Build subscription upsell UI | React component |
| Add frequency picker | UI component |
| A/B test setup | Framework |

### Phase 3: AI Targeting (Week 3)

| Task | Deliverable |
|------|-------------|
| Implement CustomerSegmentService | Segmentation |
| Create targeting rules engine | Rule evaluation |
| Integrate Anthropic for messaging | AI personalization |
| Build admin UI for rules | Dashboard |

### Phase 4: Product Page Recommendations (Week 4)

| Task | Deliverable |
|------|-------------|
| Implement ProductRecommendationService | Core recommendation engine |
| "Customers Also Bought" algorithm | Collaborative filtering |
| "You Might Like" algorithm | Personalized hybrid |
| "Frequently Viewed Together" algorithm | Session analysis + bundles |
| Product view tracking | ProductView model + events |
| Recommendation carousel component | React component |
| Bundle builder component | React component |
| Admin configuration UI | Settings page |
| Caching layer | Redis caching for performance |

### Phase 5: Placements & Tracking (Week 5)

| Task | Deliverable |
|------|-------------|
| Implement all placement components | UI components |
| Create impression tracking | Analytics |
| Build analytics dashboard | Admin UI |
| A/B testing infrastructure | Experiment system |

### Phase 6: Testing & Launch (Week 6)

| Task | Deliverable |
|------|-------------|
| E2E tests | Playwright |
| Performance optimization | <100ms response |
| Beta rollout | 10% traffic |
| Full launch | 100% traffic |

---

## Summary

This specification provides a complete smart upsell system with:

1. **Bulk Discounting** - Tiered quantity pricing with visual recommendations
2. **Subscription Conversion** - AI-predicted optimal frequencies and savings calculators
3. **AI Targeting** - Customer segments, behavior analysis, personalized messaging
4. **Strategic Placements** - Product page, cart, checkout, post-purchase
5. **A/B Testing** - Built-in experimentation framework
6. **Analytics** - Full funnel tracking and ROI measurement

**Expected Impact:**
- 10-15% increase in AOV
- 5-10% subscription conversion rate
- 20%+ upsell acceptance rate with AI targeting

---

*Document Version: 1.0*
*Created: January 2026*
