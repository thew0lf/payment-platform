'use client';

import * as React from 'react';
import { Package, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { CollapsibleCard, CollapsibleCardSection } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InventoryLocation {
  id: string;
  name: string;
  quantity: number;
  available: number;
  committed: number;
}

interface InventorySectionProps {
  sku: string;
  barcode?: string;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  locations?: InventoryLocation[];
  onSkuChange: (value: string) => void;
  onBarcodeChange?: (value: string) => void;
  onTrackInventoryChange: (value: boolean) => void;
  onStockQuantityChange: (value: number) => void;
  onLowStockThresholdChange: (value: number) => void;
  onTransferInventory?: (
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ) => void;
  defaultOpen?: boolean;
  errors?: {
    sku?: string;
    barcode?: string;
    stockQuantity?: string;
  };
}

/**
 * InventorySection - Stock tracking and multi-location inventory
 */
export function InventorySection({
  sku,
  barcode,
  trackInventory,
  stockQuantity,
  lowStockThreshold,
  locations = [],
  onSkuChange,
  onBarcodeChange,
  onTrackInventoryChange,
  onStockQuantityChange,
  onLowStockThresholdChange,
  onTransferInventory,
  defaultOpen = false,
  errors,
}: InventorySectionProps) {
  const totalStock = locations.length
    ? locations.reduce((sum, loc) => sum + loc.quantity, 0)
    : stockQuantity;

  const isLowStock = totalStock <= lowStockThreshold && totalStock > 0;
  const isOutOfStock = totalStock === 0;

  const getStockBadge = () => {
    if (isOutOfStock) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (isLowStock) {
      return (
        <Badge variant="warning" className="bg-amber-100 text-amber-800">
          Low Stock
        </Badge>
      );
    }
    return <Badge variant="secondary">{totalStock} in stock</Badge>;
  };

  return (
    <CollapsibleCard
      title="Inventory"
      subtitle="Track stock levels across locations"
      icon={<Package className="h-5 w-5" />}
      badge={trackInventory ? getStockBadge() : undefined}
      defaultOpen={defaultOpen}
      storageKey="product-inventory"
    >
      <div className="space-y-6">
        {/* SKU and Barcode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value)}
              placeholder="e.g., COFFEE-ETH-001"
              className={errors?.sku ? 'border-destructive' : ''}
            />
            {errors?.sku && (
              <p className="text-sm text-destructive">{errors.sku}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode (ISBN, UPC, GTIN, etc.)</Label>
            <Input
              id="barcode"
              value={barcode || ''}
              onChange={(e) => onBarcodeChange?.(e.target.value)}
              placeholder="e.g., 012345678901"
              className={errors?.barcode ? 'border-destructive' : ''}
            />
            {errors?.barcode && (
              <p className="text-sm text-destructive">{errors.barcode}</p>
            )}
          </div>
        </div>

        {/* Track Inventory Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div>
            <Label htmlFor="track-inventory" className="text-base font-medium">
              Track Inventory
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable stock tracking for this product
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="track-inventory"
              checked={trackInventory}
              onChange={(e) => onTrackInventoryChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>

        {/* Stock quantity when tracking is enabled */}
        {trackInventory && (
          <>
            {/* Simple stock controls for single location */}
            {locations.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-quantity">Stock Quantity</Label>
                  <Input
                    id="stock-quantity"
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) =>
                      onStockQuantityChange(parseInt(e.target.value) || 0)
                    }
                    className={errors?.stockQuantity ? 'border-destructive' : ''}
                  />
                  {errors?.stockQuantity && (
                    <p className="text-sm text-destructive">
                      {errors.stockQuantity}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold">Low Stock Alert</Label>
                  <Input
                    id="low-stock-threshold"
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) =>
                      onLowStockThresholdChange(parseInt(e.target.value) || 0)
                    }
                    placeholder="Alert when below this quantity"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get notified when stock falls below this level
                  </p>
                </div>
              </div>
            )}

            {/* Multi-location inventory */}
            {locations.length > 0 && (
              <CollapsibleCardSection title="Inventory by Location">
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Available: {location.available}</span>
                          <span>Committed: {location.committed}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          {location.quantity}
                        </span>
                        {location.quantity <= lowStockThreshold && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}

                  {onTransferInventory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer Inventory
                    </Button>
                  )}
                </div>
              </CollapsibleCardSection>
            )}

            {/* Low stock warning */}
            {isLowStock && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">
                  Stock is running low. Consider reordering soon.
                </p>
              </div>
            )}

            {isOutOfStock && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">
                  This product is out of stock and unavailable for purchase.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </CollapsibleCard>
  );
}

export default InventorySection;
