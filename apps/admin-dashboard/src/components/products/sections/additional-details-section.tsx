'use client';

import * as React from 'react';
import { MoreHorizontal, Scale, Package, RefreshCw, Calendar } from 'lucide-react';
import { CollapsibleCard, CollapsibleCardSection } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';
type FulfillmentType = 'SHIP' | 'PICKUP' | 'DIGITAL' | 'SERVICE';

interface SubscriptionSettings {
  enabled: boolean;
  interval?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  discountPercent?: number;
}

interface AdditionalDetailsSectionProps {
  weight?: number;
  weightUnit?: WeightUnit;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'in';
  };
  fulfillmentType?: FulfillmentType;
  subscription?: SubscriptionSettings;
  onWeightChange: (value: number | undefined) => void;
  onWeightUnitChange: (value: WeightUnit) => void;
  onDimensionsChange?: (dimensions: { length?: number; width?: number; height?: number; unit?: 'cm' | 'in' }) => void;
  onFulfillmentTypeChange: (value: FulfillmentType) => void;
  onSubscriptionChange?: (settings: SubscriptionSettings) => void;
  defaultOpen?: boolean;
}

const weightUnits: { value: WeightUnit; label: string }[] = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
];

const fulfillmentTypes: { value: FulfillmentType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'SHIP', label: 'Ship', description: 'Physical product shipped to customer', icon: <Package className="h-4 w-4" /> },
  { value: 'PICKUP', label: 'Pickup', description: 'Customer picks up in store', icon: <Package className="h-4 w-4" /> },
  { value: 'DIGITAL', label: 'Digital', description: 'Digital download or access', icon: <Package className="h-4 w-4" /> },
  { value: 'SERVICE', label: 'Service', description: 'Service appointment or booking', icon: <Calendar className="h-4 w-4" /> },
];

const subscriptionIntervals = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 Weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Every 3 Months' },
  { value: 'YEARLY', label: 'Yearly' },
];

/**
 * AdditionalDetailsSection - Weight, dimensions, fulfillment, and subscription settings
 */
export function AdditionalDetailsSection({
  weight,
  weightUnit = 'g',
  dimensions,
  fulfillmentType = 'SHIP',
  subscription = { enabled: false },
  onWeightChange,
  onWeightUnitChange,
  onDimensionsChange,
  onFulfillmentTypeChange,
  onSubscriptionChange,
  defaultOpen = false,
}: AdditionalDetailsSectionProps) {
  return (
    <CollapsibleCard
      title="Additional Details"
      subtitle="Shipping, fulfillment, and subscription settings"
      icon={<MoreHorizontal className="h-5 w-5" />}
      defaultOpen={defaultOpen}
      storageKey="product-additional"
    >
      <div className="space-y-6">
        {/* Fulfillment Type */}
        <CollapsibleCardSection title="Fulfillment">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fulfillmentTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onFulfillmentTypeChange(type.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  fulfillmentType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {type.icon}
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </CollapsibleCardSection>

        {/* Weight & Dimensions (only for shippable products) */}
        {(fulfillmentType === 'SHIP' || fulfillmentType === 'PICKUP') && (
          <CollapsibleCardSection title="Weight & Dimensions">
            <div className="space-y-4">
              {/* Weight */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="weight" className="flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    Weight
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={weight ?? ''}
                    onChange={(e) =>
                      onWeightChange(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="w-32">
                  <select
                    value={weightUnit}
                    onChange={(e) => onWeightUnitChange(e.target.value as WeightUnit)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {weightUnits.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              {onDimensionsChange && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Dimensions
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={dimensions?.length ?? ''}
                      onChange={(e) =>
                        onDimensionsChange({
                          ...dimensions,
                          length: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="L"
                      className="w-20"
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={dimensions?.width ?? ''}
                      onChange={(e) =>
                        onDimensionsChange({
                          ...dimensions,
                          width: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="W"
                      className="w-20"
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={dimensions?.height ?? ''}
                      onChange={(e) =>
                        onDimensionsChange({
                          ...dimensions,
                          height: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="H"
                      className="w-20"
                    />
                    <select
                      value={dimensions?.unit || 'cm'}
                      onChange={(e) =>
                        onDimensionsChange({
                          ...dimensions,
                          unit: e.target.value as 'cm' | 'in',
                        })
                      }
                      className="w-20 h-10 rounded-lg border border-border bg-background px-2 text-sm"
                    >
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCardSection>
        )}

        {/* Subscription Settings */}
        {onSubscriptionChange && (
          <CollapsibleCardSection title="Subscription">
            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label
                    htmlFor="subscription-enabled"
                    className="flex items-center gap-2 text-base font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Enable Subscriptions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to subscribe for recurring delivery
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="subscription-enabled"
                    checked={subscription.enabled}
                    onChange={(e) =>
                      onSubscriptionChange({
                        ...subscription,
                        enabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-ring after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {/* Subscription options */}
              {subscription.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="subscription-interval">Default Interval</Label>
                    <select
                      id="subscription-interval"
                      value={subscription.interval || 'MONTHLY'}
                      onChange={(e) =>
                        onSubscriptionChange({
                          ...subscription,
                          interval: e.target.value as SubscriptionSettings['interval'],
                        })
                      }
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      {subscriptionIntervals.map((interval) => (
                        <option key={interval.value} value={interval.value}>
                          {interval.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscription-discount">Subscription Discount (%)</Label>
                    <Input
                      id="subscription-discount"
                      type="number"
                      min="0"
                      max="100"
                      value={subscription.discountPercent ?? ''}
                      onChange={(e) =>
                        onSubscriptionChange({
                          ...subscription,
                          discountPercent: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="e.g., 10"
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCardSection>
        )}
      </div>
    </CollapsibleCard>
  );
}

export default AdditionalDetailsSection;
