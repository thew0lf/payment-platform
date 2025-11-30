'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Edit2, X, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  VariantOption,
  VariantOptionValue,
  CreateVariantOptionInput,
  CreateVariantOptionValueInput,
  variantOptionsApi,
} from '@/lib/api/products';

interface VariantOptionsManagerProps {
  options: VariantOption[];
  onOptionsChange: (options: VariantOption[]) => void;
  companyId?: string;
  className?: string;
}

export function VariantOptionsManager({
  options,
  onOptionsChange,
  companyId,
  className,
}: VariantOptionsManagerProps) {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionDisplayName, setNewOptionDisplayName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState<CreateVariantOptionValueInput[]>([
    { value: '', sortOrder: 0 },
  ]);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common option type suggestions
  const optionSuggestions = [
    { name: 'Size', displayName: 'Size', values: ['Small', 'Medium', 'Large', 'X-Large'] },
    { name: 'Color', displayName: 'Color', values: ['Red', 'Blue', 'Green', 'Black', 'White'] },
    { name: 'Material', displayName: 'Material', values: ['Cotton', 'Polyester', 'Wool', 'Leather'] },
    { name: 'Style', displayName: 'Style', values: ['Classic', 'Modern', 'Vintage'] },
  ];

  const handleAddNewValue = useCallback(() => {
    setNewOptionValues([
      ...newOptionValues,
      { value: '', sortOrder: newOptionValues.length },
    ]);
  }, [newOptionValues]);

  const handleRemoveNewValue = useCallback((index: number) => {
    if (newOptionValues.length <= 1) return;
    setNewOptionValues(newOptionValues.filter((_, i) => i !== index));
  }, [newOptionValues]);

  const handleNewValueChange = useCallback((index: number, field: keyof CreateVariantOptionValueInput, value: string) => {
    const updated = [...newOptionValues];
    updated[index] = { ...updated[index], [field]: value };
    setNewOptionValues(updated);
  }, [newOptionValues]);

  const handleCreateOption = useCallback(async () => {
    if (!newOptionName.trim()) {
      setError('Option name is required');
      return;
    }

    const validValues = newOptionValues.filter(v => v.value.trim());
    if (validValues.length === 0) {
      setError('At least one value is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input: CreateVariantOptionInput = {
        name: newOptionName.trim(),
        displayName: newOptionDisplayName.trim() || newOptionName.trim(),
        values: validValues.map((v, index) => ({
          value: v.value.trim(),
          displayValue: v.displayValue?.trim(),
          colorCode: v.colorCode,
          sortOrder: index,
        })),
      };

      const created = await variantOptionsApi.create(input, companyId);
      onOptionsChange([...options, created]);

      // Reset form
      setIsAddingOption(false);
      setNewOptionName('');
      setNewOptionDisplayName('');
      setNewOptionValues([{ value: '', sortOrder: 0 }]);
    } catch (err: any) {
      setError(err.message || 'Failed to create option');
    } finally {
      setIsLoading(false);
    }
  }, [newOptionName, newOptionDisplayName, newOptionValues, companyId, options, onOptionsChange]);

  const handleDeleteOption = useCallback(async (optionId: string) => {
    if (!confirm('Are you sure you want to delete this option? This will affect all variants using it.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await variantOptionsApi.delete(optionId);
      onOptionsChange(options.filter(o => o.id !== optionId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete option');
    } finally {
      setIsLoading(false);
    }
  }, [options, onOptionsChange]);

  const handleAddValue = useCallback(async (optionId: string, value: string, colorCode?: string) => {
    if (!value.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const newValue = await variantOptionsApi.addValue(optionId, {
        value: value.trim(),
        colorCode,
      });

      const updatedOptions = options.map(opt =>
        opt.id === optionId
          ? { ...opt, values: [...opt.values, newValue] }
          : opt
      );
      onOptionsChange(updatedOptions);
    } catch (err: any) {
      setError(err.message || 'Failed to add value');
    } finally {
      setIsLoading(false);
    }
  }, [options, onOptionsChange]);

  const handleRemoveValue = useCallback(async (optionId: string, valueId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await variantOptionsApi.removeValue(optionId, valueId);

      const updatedOptions = options.map(opt =>
        opt.id === optionId
          ? { ...opt, values: opt.values.filter(v => v.id !== valueId) }
          : opt
      );
      onOptionsChange(updatedOptions);
    } catch (err: any) {
      setError(err.message || 'Failed to remove value');
    } finally {
      setIsLoading(false);
    }
  }, [options, onOptionsChange]);

  const handleUseSuggestion = useCallback((suggestion: typeof optionSuggestions[0]) => {
    setNewOptionName(suggestion.name);
    setNewOptionDisplayName(suggestion.displayName);
    setNewOptionValues(suggestion.values.map((v, i) => ({ value: v, sortOrder: i })));
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Existing options */}
      {options.map((option) => (
        <OptionCard
          key={option.id}
          option={option}
          isEditing={editingOptionId === option.id}
          onEdit={() => setEditingOptionId(option.id)}
          onCancelEdit={() => setEditingOptionId(null)}
          onDelete={() => handleDeleteOption(option.id)}
          onAddValue={(value, colorCode) => handleAddValue(option.id, value, colorCode)}
          onRemoveValue={(valueId) => handleRemoveValue(option.id, valueId)}
          isLoading={isLoading}
        />
      ))}

      {/* Add new option form */}
      {isAddingOption ? (
        <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">New Option</h4>
            <button
              onClick={() => setIsAddingOption(false)}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {optionSuggestions
              .filter(s => !options.some(o => o.name.toLowerCase() === s.name.toLowerCase()))
              .map((suggestion) => (
                <button
                  key={suggestion.name}
                  onClick={() => handleUseSuggestion(suggestion)}
                  className="px-2.5 py-1 text-xs rounded-full border border-zinc-600 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-zinc-300"
                >
                  {suggestion.name}
                </button>
              ))}
          </div>

          {/* Option name inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Option Name</label>
              <Input
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                placeholder="e.g., Size, Color"
                className="bg-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Display Name (optional)</label>
              <Input
                value={newOptionDisplayName}
                onChange={(e) => setNewOptionDisplayName(e.target.value)}
                placeholder="e.g., Select Size"
                className="bg-zinc-900"
              />
            </div>
          </div>

          {/* Values */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Values</label>
            <div className="space-y-2">
              {newOptionValues.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={value.value}
                    onChange={(e) => handleNewValueChange(index, 'value', e.target.value)}
                    placeholder="e.g., Small, Red"
                    className="bg-zinc-900 flex-1"
                  />
                  {newOptionName.toLowerCase() === 'color' && (
                    <div className="relative">
                      <input
                        type="color"
                        value={value.colorCode || '#000000'}
                        onChange={(e) => handleNewValueChange(index, 'colorCode', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  )}
                  {newOptionValues.length > 1 && (
                    <button
                      onClick={() => handleRemoveNewValue(index)}
                      className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddNewValue}
                className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300"
              >
                <Plus className="h-4 w-4" />
                Add Value
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingOption(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateOption}
              disabled={isLoading || !newOptionName.trim()}
            >
              Create Option
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAddingOption(true)}
          className="w-full gap-2 border-dashed"
        >
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      )}
    </div>
  );
}

// Individual option card component
interface OptionCardProps {
  option: VariantOption;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onAddValue: (value: string, colorCode?: string) => void;
  onRemoveValue: (valueId: string) => void;
  isLoading: boolean;
}

function OptionCard({
  option,
  isEditing,
  onEdit,
  onCancelEdit,
  onDelete,
  onAddValue,
  onRemoveValue,
  isLoading,
}: OptionCardProps) {
  const [newValue, setNewValue] = useState('');
  const [newColorCode, setNewColorCode] = useState('#000000');
  const isColorOption = option.name.toLowerCase() === 'color';

  const handleAddValue = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim(), isColorOption ? newColorCode : undefined);
      setNewValue('');
      setNewColorCode('#000000');
    }
  };

  return (
    <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-zinc-600 cursor-move" />
          <span className="font-medium text-white">{option.displayName || option.name}</span>
          <span className="text-xs text-zinc-500">({option.name})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Values */}
      <div className="flex flex-wrap gap-2 mb-3">
        {option.values.map((value) => (
          <div
            key={value.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-600 bg-zinc-700/50"
          >
            {value.colorCode && (
              <div
                className="w-3 h-3 rounded-full border border-zinc-500"
                style={{ backgroundColor: value.colorCode }}
              />
            )}
            <span className="text-sm text-zinc-200">
              {value.displayValue || value.value}
            </span>
            <button
              onClick={() => onRemoveValue(value.id)}
              disabled={isLoading}
              className="p-0.5 hover:bg-zinc-600 rounded text-zinc-400 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add value inline */}
      <div className="flex items-center gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Add value..."
          className="bg-zinc-900 h-8 text-sm flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddValue()}
        />
        {isColorOption && (
          <input
            type="color"
            value={newColorCode}
            onChange={(e) => setNewColorCode(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddValue}
          disabled={isLoading || !newValue.trim()}
          className="h-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
