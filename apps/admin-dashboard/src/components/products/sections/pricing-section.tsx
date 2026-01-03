'use client';

import * as React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { CollapsibleCard, CollapsibleCardSection } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PricingSectionProps {
  price: number | string;
  compareAtPrice?: number | string;
  costPrice?: number | string;
  currency?: string;
  onPriceChange: (value: number | string) => void;
  onCompareAtPriceChange: (value: number | string) => void;
  onCostPriceChange: (value: number | string) => void;
  defaultOpen?: boolean;
  errors?: {
    price?: string;
    compareAtPrice?: string;
    costPrice?: string;
  };
}

/**
 * PricingSection - Product pricing with profit margin calculation
 */
export function PricingSection({
  price,
  compareAtPrice,
  costPrice,
  currency = 'USD',
  onPriceChange,
  onCompareAtPriceChange,
  onCostPriceChange,
  defaultOpen = true,
  errors,
}: PricingSectionProps) {
  // Calculate profit margin
  const priceNum = typeof price === 'string' ? parseFloat(price) || 0 : price;
  const costNum =
    typeof costPrice === 'string' ? parseFloat(costPrice) || 0 : costPrice || 0;
  const compareNum =
    typeof compareAtPrice === 'string'
      ? parseFloat(compareAtPrice) || 0
      : compareAtPrice || 0;

  const profit = priceNum - costNum;
  const margin = costNum > 0 ? ((profit / priceNum) * 100).toFixed(1) : '--';
  const discount =
    compareNum > 0 && compareNum > priceNum
      ? (((compareNum - priceNum) / compareNum) * 100).toFixed(0)
      : null;

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <CollapsibleCard
      title="Pricing"
      subtitle="Set your product's price and cost"
      icon={<DollarSign className="h-5 w-5" />}
      defaultOpen={defaultOpen}
      storageKey="product-pricing"
    >
      <div className="space-y-6">
        {/* Main pricing inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => onPriceChange(e.target.value)}
                className={`pl-7 ${errors?.price ? 'border-destructive' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors?.price && (
              <p className="text-sm text-destructive">{errors.price}</p>
            )}
          </div>

          {/* Compare at Price */}
          <div className="space-y-2">
            <Label htmlFor="compare-at-price">Compare at Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="compare-at-price"
                type="number"
                step="0.01"
                min="0"
                value={compareAtPrice || ''}
                onChange={(e) => onCompareAtPriceChange(e.target.value)}
                className={`pl-7 ${errors?.compareAtPrice ? 'border-destructive' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors?.compareAtPrice && (
              <p className="text-sm text-destructive">{errors.compareAtPrice}</p>
            )}
            {discount && (
              <p className="text-sm text-green-600">
                {discount}% off
              </p>
            )}
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <Label htmlFor="cost-price">Cost per Item</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="cost-price"
                type="number"
                step="0.01"
                min="0"
                value={costPrice || ''}
                onChange={(e) => onCostPriceChange(e.target.value)}
                className={`pl-7 ${errors?.costPrice ? 'border-destructive' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors?.costPrice && (
              <p className="text-sm text-destructive">{errors.costPrice}</p>
            )}
          </div>
        </div>

        {/* Profit margin summary */}
        {costNum > 0 && priceNum > 0 && (
          <CollapsibleCardSection title="Profit Analysis">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <TrendingUp
                className={`h-8 w-8 ${profit > 0 ? 'text-green-600' : 'text-destructive'}`}
              />
              <div className="flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cost</p>
                    <p className="font-medium">{formatCurrency(costNum)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit</p>
                    <p
                      className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-destructive'}`}
                    >
                      {formatCurrency(profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margin</p>
                    <p
                      className={`font-medium ${parseFloat(margin) > 0 ? 'text-green-600' : 'text-destructive'}`}
                    >
                      {margin}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleCardSection>
        )}

        {/* Helper text */}
        <p className="text-xs text-muted-foreground">
          Compare at price is shown as the original price when the product is on
          sale. Cost per item is used to calculate profit margins.
        </p>
      </div>
    </CollapsibleCard>
  );
}

export default PricingSection;
