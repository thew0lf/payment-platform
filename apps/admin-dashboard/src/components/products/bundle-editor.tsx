'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Trash2,
  GripVertical,
  Calculator,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  bundlesApi,
  Bundle,
  BundleItem,
  BundleType,
  BundlePricing,
  AdjustmentType,
  PriceCalculation,
} from '@/lib/api/bundles';
import { productsApi, Product } from '@/lib/api/products';

interface BundleEditorProps {
  productId: string;
  companyId: string;
  productPrice?: number;
  onBundleChange?: (bundle: Bundle | null) => void;
  className?: string;
}

const BUNDLE_TYPES: { value: BundleType; label: string; description: string }[] = [
  { value: 'FIXED', label: 'Fixed Bundle', description: 'All items included, fixed composition' },
  { value: 'MIX_AND_MATCH', label: 'Mix & Match', description: 'Customer chooses items within limits' },
  { value: 'SUBSCRIPTION_BOX', label: 'Subscription Box', description: 'Recurring bundle delivery' },
];

const PRICING_STRATEGIES: { value: BundlePricing; label: string; description: string }[] = [
  { value: 'FIXED', label: 'Fixed Price', description: 'Bundle sold at set product price' },
  { value: 'CALCULATED', label: 'Sum of Items', description: 'Price equals sum of all items with optional discount' },
  { value: 'TIERED', label: 'Tiered Discount', description: 'More items = bigger discount' },
];

const DISCOUNT_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'PERCENTAGE', label: 'Percentage Off' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount Off' },
  { value: 'FIXED_PRICE', label: 'Set Total Price' },
];

export function BundleEditor({
  productId,
  companyId,
  productPrice,
  onBundleChange,
  className,
}: BundleEditorProps) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [priceCalc, setPriceCalc] = useState<PriceCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bundleData, productsData] = await Promise.all([
        bundlesApi.getByProduct(productId).catch(() => null),
        productsApi.list({ companyId, limit: 100 }),
      ]);
      setBundle(bundleData);
      // Filter out the current product from the list
      setProducts((productsData.products || []).filter((p) => p.id !== productId));
      onBundleChange?.(bundleData);

      if (bundleData) {
        const calc = await bundlesApi.calculatePrice(bundleData.id);
        setPriceCalc(calc);
      }
    } catch (err: any) {
      console.error('Failed to load bundle data:', err);
      setError(err.message || 'Failed to load bundle data');
    } finally {
      setLoading(false);
    }
  }, [productId, companyId, onBundleChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createBundle = async (type: BundleType) => {
    setSaving(true);
    setError(null);
    try {
      const newBundle = await bundlesApi.create({
        productId,
        type,
        pricingStrategy: 'FIXED',
        isActive: true,
      });
      setBundle(newBundle);
      onBundleChange?.(newBundle);
    } catch (err: any) {
      console.error('Failed to create bundle:', err);
      setError(err.message || 'Failed to create bundle');
    } finally {
      setSaving(false);
    }
  };

  const updateBundle = async (updates: Partial<Bundle>) => {
    if (!bundle) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await bundlesApi.update(bundle.id, updates);
      setBundle(updated);
      onBundleChange?.(updated);

      const calc = await bundlesApi.calculatePrice(updated.id);
      setPriceCalc(calc);
    } catch (err: any) {
      console.error('Failed to update bundle:', err);
      setError(err.message || 'Failed to update bundle');
    } finally {
      setSaving(false);
    }
  };

  const deleteBundle = () => {
    if (!bundle) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBundle = async () => {
    if (!bundle) return;
    setSaving(true);
    setError(null);
    try {
      await bundlesApi.delete(bundle.id);
      setBundle(null);
      setPriceCalc(null);
      onBundleChange?.(null);
      toast.success('Bundle configuration removed');
    } catch (err: any) {
      console.error('Failed to delete bundle:', err);
      toast.error('Failed to delete bundle');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const addItem = async () => {
    if (!bundle || !selectedProductId) return;

    setSaving(true);
    setError(null);
    try {
      await bundlesApi.addItem(bundle.id, {
        productId: selectedProductId,
        quantity: 1,
        isRequired: true,
      });
      await fetchData();
      setShowAddProduct(false);
      setSelectedProductId('');
    } catch (err: any) {
      console.error('Failed to add item:', err);
      setError(err.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!bundle) return;

    setError(null);
    try {
      await bundlesApi.removeItem(bundle.id, itemId);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to remove item:', err);
      setError(err.message || 'Failed to remove item');
    }
  };

  const updateItemQuantity = async (itemId: string, quantity: number) => {
    if (!bundle || quantity < 1) return;

    setError(null);
    try {
      await bundlesApi.updateItem(bundle.id, itemId, { quantity });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to update item:', err);
      setError(err.message || 'Failed to update item');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  // No bundle yet - show creation options
  if (!bundle) {
    return (
      <div className={cn('space-y-4', className)}>
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Make this product a bundle to include multiple items.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BUNDLE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => createBundle(type.value)}
              disabled={saving}
              className="p-4 bg-muted border border-border rounded-lg text-left hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              <p className="text-sm font-medium text-foreground">{type.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Bundle Settings Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-medium text-foreground">Bundle Configuration</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={deleteBundle}
          disabled={saving}
          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Remove Bundle
        </Button>
      </div>

      {/* Bundle Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Bundle Type
          </label>
          <select
            value={bundle.type}
            onChange={(e) => updateBundle({ type: e.target.value as BundleType })}
            disabled={saving}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            {BUNDLE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Strategy */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Pricing Strategy
          </label>
          <select
            value={bundle.pricingStrategy}
            onChange={(e) => updateBundle({ pricingStrategy: e.target.value as BundlePricing })}
            disabled={saving}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            {PRICING_STRATEGIES.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
        </div>

        {/* Discount Settings (for CALCULATED pricing) */}
        {bundle.pricingStrategy === 'CALCULATED' && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Discount Type
              </label>
              <select
                value={bundle.discountType || ''}
                onChange={(e) =>
                  updateBundle({
                    discountType: e.target.value ? (e.target.value as AdjustmentType) : undefined,
                  })
                }
                disabled={saving}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="">No discount</option>
                {DISCOUNT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
            {bundle.discountType && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {bundle.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount'}
                </label>
                <Input
                  type="number"
                  value={bundle.discountValue || ''}
                  onChange={(e) =>
                    updateBundle({ discountValue: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  max={bundle.discountType === 'PERCENTAGE' ? 100 : undefined}
                  disabled={saving}
                  className="bg-muted"
                />
              </div>
            )}
          </>
        )}

        {/* Min/Max Items (for MIX_AND_MATCH) */}
        {bundle.type === 'MIX_AND_MATCH' && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Min Items
              </label>
              <Input
                type="number"
                value={bundle.minItems || ''}
                onChange={(e) =>
                  updateBundle({ minItems: parseInt(e.target.value) || undefined })
                }
                min="1"
                disabled={saving}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Max Items
              </label>
              <Input
                type="number"
                value={bundle.maxItems || ''}
                onChange={(e) =>
                  updateBundle({ maxItems: parseInt(e.target.value) || undefined })
                }
                min="1"
                disabled={saving}
                className="bg-muted"
              />
            </div>
          </>
        )}

        {/* Active Status */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="bundle-active"
            checked={bundle.isActive}
            onChange={(e) => updateBundle({ isActive: e.target.checked })}
            disabled={saving}
            className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary/50"
          />
          <label htmlFor="bundle-active" className="text-sm text-foreground">
            Bundle is active
          </label>
        </div>
      </div>

      {/* Bundle Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Bundle Items</h4>
          <button
            onClick={() => setShowAddProduct(true)}
            disabled={saving}
            className="flex items-center gap-1 px-2 py-1 text-sm text-primary hover:text-primary disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {bundle.items.length > 0 ? (
          <div className="space-y-2">
            {bundle.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {item.product?.name || 'Unknown Product'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.product?.sku} • {formatCurrency(Number(item.product?.price) || 0)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Qty:</span>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItemQuantity(item.id, parseInt(e.target.value) || 1)
                    }
                    min="1"
                    className="w-16 px-2 py-1 bg-muted border border-border rounded text-foreground text-center text-sm"
                  />
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg border border-border border-dashed">
            No items in bundle yet. Click "Add Product" to get started.
          </p>
        )}
      </div>

      {/* Price Calculation */}
      {priceCalc && bundle.items.length > 0 && (
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Price Calculation</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items Total:</span>
              <span className="text-foreground">{formatCurrency(priceCalc.itemsTotal)}</span>
            </div>
            {priceCalc.discountAmount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount:</span>
                <span>-{formatCurrency(priceCalc.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-2 border-t border-border">
              <span className="text-foreground">Final Price:</span>
              <span className="text-primary">{formatCurrency(priceCalc.finalPrice)}</span>
            </div>
          </div>

          {/* Breakdown */}
          {priceCalc.breakdown.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Breakdown:</p>
              {priceCalc.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <span>{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddProduct(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Add Product to Bundle</h3>
                <button
                  onClick={() => setShowAddProduct(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground mb-4"
              >
                <option value="">Select a product</option>
                {products
                  .filter(
                    (p) => !bundle.items.some((item) => item.productId === p.id),
                  )
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddProduct(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addItem}
                  disabled={!selectedProductId || saving}
                >
                  {saving ? 'Adding...' : 'Add to Bundle'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Bundle Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Remove Bundle?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to remove the bundle configuration? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteBundle} disabled={saving}>
                  {saving ? 'Removing...' : 'Remove Bundle'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
