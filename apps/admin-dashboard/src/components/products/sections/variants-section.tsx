'use client';

import * as React from 'react';
import { Layers, Plus } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Variant {
  id: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  options: Record<string, string>;
  stockQuantity: number;
  isActive: boolean;
}

interface VariantOption {
  id: string;
  name: string; // e.g., "Size", "Color", "Roast Level"
  values: string[]; // e.g., ["Small", "Medium", "Large"]
}

interface VariantsSectionProps {
  variants: Variant[];
  options: VariantOption[];
  onVariantsChange: (variants: Variant[]) => void;
  onOptionsChange: (options: VariantOption[]) => void;
  onAddVariant?: () => void;
  onEditVariant?: (variantId: string) => void;
  onDeleteVariant?: (variantId: string) => void;
  basePrice?: number;
  defaultOpen?: boolean;
  isLoading?: boolean;
}

/**
 * VariantsSection - Product variants with options (wraps VariantMatrix)
 *
 * This is a wrapper component that provides the CollapsibleCard UI
 * and delegates to the existing VariantMatrix for the actual variant editing.
 */
export function VariantsSection({
  variants,
  options,
  onVariantsChange,
  onOptionsChange,
  onAddVariant,
  onEditVariant,
  onDeleteVariant,
  basePrice = 0,
  defaultOpen = false,
  isLoading = false,
}: VariantsSectionProps) {
  const activeVariants = variants.filter((v) => v.isActive);
  const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);

  // Format currency
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);

  if (options.length === 0 && variants.length === 0) {
    return (
      <CollapsibleCard
        title="Variants"
        subtitle="Add size, color, or other options"
        icon={<Layers className="h-5 w-5" />}
        defaultOpen={defaultOpen}
        storageKey="product-variants"
      >
        <div className="text-center py-8">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No variants yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add variants if this product comes in different sizes, colors, or
            other options.
          </p>
          {onAddVariant && (
            <Button type="button" variant="outline" onClick={onAddVariant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variant Options
            </Button>
          )}
        </div>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      title="Variants"
      subtitle="Product options and combinations"
      icon={<Layers className="h-5 w-5" />}
      badge={
        <Badge variant="secondary">
          {activeVariants.length} variant{activeVariants.length !== 1 ? 's' : ''}
        </Badge>
      }
      defaultOpen={defaultOpen}
      storageKey="product-variants"
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Option summary */}
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted"
                >
                  <span className="text-sm font-medium">{option.name}:</span>
                  <span className="text-sm text-muted-foreground">
                    {option.values.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Variant list */}
          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  variant.isActive ? 'border-border' : 'border-border/50 bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {Object.values(variant.options).join(' / ') || 'Default'}
                      </span>
                      {!variant.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SKU: {variant.sku} • Stock: {variant.stockQuantity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(variant.price)}</p>
                    {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(variant.compareAtPrice)}
                      </p>
                    )}
                  </div>
                  {onEditVariant && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditVariant(variant.id)}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
            <span>
              {activeVariants.length} of {variants.length} variant(s) active
            </span>
            <span>Total stock: {totalStock}</span>
          </div>

          {/* Add variant button */}
          {onAddVariant && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onAddVariant}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}

export default VariantsSection;
