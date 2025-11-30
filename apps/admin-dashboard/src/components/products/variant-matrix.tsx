'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Package,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ProductVariant,
  VariantOption,
  GenerateVariantsInput,
  BulkUpdateVariantInput,
  variantsApi,
} from '@/lib/api/products';

interface VariantMatrixProps {
  productId: string;
  variants: ProductVariant[];
  availableOptions: VariantOption[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  productSku?: string;
  defaultPrice?: number;
  className?: string;
}

export function VariantMatrix({
  productId,
  variants,
  availableOptions,
  onVariantsChange,
  productSku,
  defaultPrice,
  className,
}: VariantMatrixProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editedVariant, setEditedVariant] = useState<Partial<ProductVariant>>({});
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkInventory, setBulkInventory] = useState<string>('');

  // Get options that aren't already used
  const unusedOptions = useMemo(() => {
    return availableOptions.filter(opt => !selectedOptions.includes(opt.id));
  }, [availableOptions, selectedOptions]);

  // Calculate total combinations
  const totalCombinations = useMemo(() => {
    return selectedOptions.reduce((total, optionId) => {
      const option = availableOptions.find(o => o.id === optionId);
      return total * (option?.values.length || 1);
    }, 1);
  }, [selectedOptions, availableOptions]);

  const handleToggleOption = useCallback((optionId: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedOptions.length === 0) {
      setError('Please select at least one option');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const input: GenerateVariantsInput = {
        optionIds: selectedOptions,
        skuPrefix: productSku,
        defaultPrice,
        defaultInventory: 0,
        trackInventory: true,
      };

      const result = await variantsApi.generate(productId, input);
      onVariantsChange([...variants, ...result.variants]);
      setSelectedOptions([]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate variants');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedOptions, productId, productSku, defaultPrice, variants, onVariantsChange]);

  const handleDeleteVariant = useCallback(async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) {
      return;
    }

    try {
      await variantsApi.delete(productId, variantId);
      onVariantsChange(variants.filter(v => v.id !== variantId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete variant');
    }
  }, [productId, variants, onVariantsChange]);

  const handleStartEdit = useCallback((variant: ProductVariant) => {
    setEditingVariantId(variant.id);
    setEditedVariant({
      price: variant.price,
      inventoryQuantity: variant.inventoryQuantity,
      sku: variant.sku,
      isActive: variant.isActive,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingVariantId(null);
    setEditedVariant({});
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingVariantId) return;

    setIsSaving(true);
    try {
      const updated = await variantsApi.update(productId, editingVariantId, editedVariant);
      onVariantsChange(variants.map(v => v.id === editingVariantId ? updated : v));
      setEditingVariantId(null);
      setEditedVariant({});
    } catch (err: any) {
      setError(err.message || 'Failed to update variant');
    } finally {
      setIsSaving(false);
    }
  }, [editingVariantId, editedVariant, productId, variants, onVariantsChange]);

  const handleBulkUpdate = useCallback(async () => {
    const updates: BulkUpdateVariantInput[] = variants
      .filter(v => v.isActive)
      .map(v => ({
        id: v.id,
        ...(bulkPrice ? { price: parseFloat(bulkPrice) } : {}),
        ...(bulkInventory ? { inventoryQuantity: parseInt(bulkInventory) } : {}),
      }))
      .filter(u => u.price !== undefined || u.inventoryQuantity !== undefined);

    if (updates.length === 0) return;

    setIsSaving(true);
    try {
      const updated = await variantsApi.bulkUpdate(productId, { variants: updates });
      const updatedMap = new Map(updated.map(v => [v.id, v]));
      onVariantsChange(variants.map(v => updatedMap.get(v.id) || v));
      setBulkPrice('');
      setBulkInventory('');
    } catch (err: any) {
      setError(err.message || 'Failed to bulk update');
    } finally {
      setIsSaving(false);
    }
  }, [variants, bulkPrice, bulkInventory, productId, onVariantsChange]);

  const handleToggleActive = useCallback(async (variantId: string, isActive: boolean) => {
    try {
      const updated = await variantsApi.update(productId, variantId, { isActive });
      onVariantsChange(variants.map(v => v.id === variantId ? updated : v));
    } catch (err: any) {
      setError(err.message || 'Failed to update variant');
    }
  }, [productId, variants, onVariantsChange]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Generate section */}
      <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <h3 className="font-medium text-white">Generate Variants</h3>
        </div>

        {/* Option selection */}
        <div className="space-y-3 mb-4">
          <p className="text-sm text-zinc-400">
            Select options to generate variant combinations:
          </p>
          <div className="flex flex-wrap gap-2">
            {availableOptions.map((option) => {
              const isSelected = selectedOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleToggleOption(option.id)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-2',
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-zinc-600 text-zinc-300 hover:border-zinc-500'
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                  {option.displayName || option.name}
                  <span className="text-xs text-zinc-500">({option.values.length})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate preview */}
        {selectedOptions.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
            <span className="text-sm text-zinc-400">
              Will generate <strong className="text-white">{totalCombinations}</strong> variants
            </span>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Variants
            </Button>
          </div>
        )}
      </div>

      {/* Variants table */}
      {variants.length > 0 && (
        <div className="rounded-lg border border-zinc-700 overflow-hidden">
          {/* Bulk actions header */}
          <div className="p-3 bg-zinc-800/50 border-b border-zinc-700 flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Input
                type="number"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="Set all prices"
                className="w-32 h-8 text-sm bg-zinc-900"
              />
              <Input
                type="number"
                value={bulkInventory}
                onChange={(e) => setBulkInventory(e.target.value)}
                placeholder="Set all stock"
                className="w-32 h-8 text-sm bg-zinc-900"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkUpdate}
                disabled={isSaving || (!bulkPrice && !bulkInventory)}
              >
                Apply to All
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                    Inventory
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-zinc-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {variants.map((variant) => {
                  const isEditing = editingVariantId === variant.id;

                  return (
                    <tr
                      key={variant.id}
                      className={cn(
                        'transition-colors',
                        !variant.isActive && 'opacity-50',
                        isEditing && 'bg-zinc-800/50'
                      )}
                    >
                      {/* Variant name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm text-white">{variant.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(variant.options || {}).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 text-xs rounded bg-zinc-700/50 text-zinc-400"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            value={editedVariant.sku || ''}
                            onChange={(e) => setEditedVariant(prev => ({ ...prev, sku: e.target.value }))}
                            className="h-8 w-32 text-sm bg-zinc-900"
                          />
                        ) : (
                          <span className="text-sm font-mono text-zinc-300">{variant.sku}</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editedVariant.price ?? ''}
                            onChange={(e) => setEditedVariant(prev => ({
                              ...prev,
                              price: e.target.value ? parseFloat(e.target.value) : undefined,
                            }))}
                            className="h-8 w-24 text-sm bg-zinc-900 text-right"
                          />
                        ) : (
                          <span className="text-sm text-zinc-300">
                            {variant.price != null ? `$${variant.price.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Inventory */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editedVariant.inventoryQuantity ?? ''}
                            onChange={(e) => setEditedVariant(prev => ({
                              ...prev,
                              inventoryQuantity: e.target.value ? parseInt(e.target.value) : undefined,
                            }))}
                            className="h-8 w-20 text-sm bg-zinc-900 text-right"
                          />
                        ) : (
                          <span className={cn(
                            'text-sm',
                            variant.inventoryQuantity <= 0
                              ? 'text-red-400'
                              : variant.inventoryQuantity <= (variant.lowStockThreshold || 10)
                                ? 'text-yellow-400'
                                : 'text-zinc-300'
                          )}>
                            {variant.inventoryQuantity}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(variant.id, !variant.isActive)}
                          className={cn(
                            'px-2 py-1 text-xs rounded-full',
                            variant.isActive
                              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                              : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600'
                          )}
                        >
                          {variant.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(variant)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteVariant(variant.id)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {variants.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-zinc-400 mb-2">No variants yet</p>
          <p className="text-sm">
            Select options above and generate variants, or add them manually.
          </p>
        </div>
      )}
    </div>
  );
}
