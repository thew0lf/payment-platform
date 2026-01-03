'use client';

import * as React from 'react';
import { Sliders, HelpCircle } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type {
  MetafieldType,
  CategoryMetafieldDefinition,
  ProductMetafieldValue,
} from '@/lib/api/category-metafields';

interface MetafieldsSectionProps {
  definitions: CategoryMetafieldDefinition[];
  values: ProductMetafieldValue[];
  onValuesChange: (values: ProductMetafieldValue[]) => void;
  defaultOpen?: boolean;
  isLoading?: boolean;
}

/**
 * MetafieldsSection - Dynamic custom fields based on product categories
 */
export function MetafieldsSection({
  definitions,
  values,
  onValuesChange,
  defaultOpen = false,
  isLoading = false,
}: MetafieldsSectionProps) {
  // Create a map of definition ID to current value
  const valueMap = React.useMemo(() => {
    const map = new Map<string, ProductMetafieldValue>();
    values.forEach((v) => map.set(v.definitionId, v));
    return map;
  }, [values]);

  const getValue = (definitionId: string) => valueMap.get(definitionId);

  const updateValue = (
    definition: CategoryMetafieldDefinition,
    newValue: Partial<ProductMetafieldValue>
  ) => {
    const existing = getValue(definition.id);
    const updated: ProductMetafieldValue = {
      id: existing?.id || '',
      productId: existing?.productId || '',
      definitionId: definition.id,
      definition,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...existing,
      ...newValue,
    };

    const newValues = values.filter((v) => v.definitionId !== definition.id);
    newValues.push(updated);
    onValuesChange(newValues);
  };

  const renderField = (definition: CategoryMetafieldDefinition) => {
    const value = getValue(definition.id);
    const fieldId = `metafield-${definition.id}`;

    switch (definition.type) {
      case 'TEXT':
        return (
          <Input
            id={fieldId}
            value={value?.textValue || ''}
            onChange={(e) => updateValue(definition, { textValue: e.target.value })}
            placeholder={definition.placeholder || `Enter ${definition.name.toLowerCase()}`}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            id={fieldId}
            value={value?.textValue || ''}
            onChange={(e) => updateValue(definition, { textValue: e.target.value })}
            placeholder={definition.placeholder || `Enter ${definition.name.toLowerCase()}`}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        );

      case 'NUMBER':
        return (
          <Input
            id={fieldId}
            type="number"
            value={value?.numberValue ?? ''}
            onChange={(e) =>
              updateValue(definition, {
                numberValue: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder={definition.placeholder || '0'}
            min={definition.validation?.min}
            max={definition.validation?.max}
          />
        );

      case 'SELECT':
        return (
          <select
            id={fieldId}
            value={value?.textValue || ''}
            onChange={(e) => updateValue(definition, { textValue: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select {definition.name.toLowerCase()}...</option>
            {definition.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'MULTI_SELECT': {
        const selectedValues = (value?.jsonValue as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedValues.map((selected) => (
                <Badge key={selected} variant="secondary" className="pr-1">
                  {selected}
                  <button
                    type="button"
                    onClick={() =>
                      updateValue(definition, {
                        jsonValue: selectedValues.filter((v) => v !== selected),
                      })
                    }
                    className="ml-1 p-0.5 rounded-full hover:bg-background/20"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <select
              id={fieldId}
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedValues.includes(e.target.value)) {
                  updateValue(definition, {
                    jsonValue: [...selectedValues, e.target.value],
                  });
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Add {definition.name.toLowerCase()}...</option>
              {definition.options
                ?.filter((opt) => !selectedValues.includes(opt))
                .map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          </div>
        );
      }

      case 'BOOLEAN':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id={fieldId}
              type="checkbox"
              checked={value?.booleanValue || false}
              onChange={(e) =>
                updateValue(definition, { booleanValue: e.target.checked })
              }
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm">Yes</span>
          </label>
        );

      case 'DATE':
        return (
          <Input
            id={fieldId}
            type="date"
            value={value?.dateValue?.split('T')[0] || ''}
            onChange={(e) =>
              updateValue(definition, {
                dateValue: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
          />
        );

      case 'COLOR':
        return (
          <div className="flex items-center gap-2">
            <input
              id={fieldId}
              type="color"
              value={value?.textValue || '#000000'}
              onChange={(e) => updateValue(definition, { textValue: e.target.value })}
              className="h-10 w-14 rounded border border-border cursor-pointer"
            />
            <Input
              value={value?.textValue || ''}
              onChange={(e) => updateValue(definition, { textValue: e.target.value })}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        );

      case 'URL':
        return (
          <Input
            id={fieldId}
            type="url"
            value={value?.textValue || ''}
            onChange={(e) => updateValue(definition, { textValue: e.target.value })}
            placeholder={definition.placeholder || 'https://example.com'}
          />
        );

      default:
        return (
          <Input
            id={fieldId}
            value={value?.textValue || ''}
            onChange={(e) => updateValue(definition, { textValue: e.target.value })}
            placeholder={definition.placeholder}
          />
        );
    }
  };

  // Sort definitions by sortOrder
  const sortedDefinitions = [...definitions].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const requiredCount = definitions.filter((d) => d.required).length;
  const filledRequired = definitions.filter(
    (d) => d.required && getValue(d.id)
  ).length;

  if (definitions.length === 0) {
    return (
      <CollapsibleCard
        title="Custom Fields"
        subtitle="No custom fields defined for this product's categories"
        icon={<Sliders className="h-5 w-5" />}
        defaultOpen={defaultOpen}
        storageKey="product-metafields"
      >
        <p className="text-sm text-muted-foreground">
          Custom fields will appear here when you assign this product to a
          category that has metafield definitions configured.
        </p>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      title="Custom Fields"
      subtitle="Category-specific attributes for this product"
      icon={<Sliders className="h-5 w-5" />}
      badge={
        requiredCount > 0 ? (
          <Badge
            variant={filledRequired === requiredCount ? 'default' : 'secondary'}
          >
            {filledRequired}/{requiredCount} required
          </Badge>
        ) : undefined
      }
      defaultOpen={defaultOpen}
      storageKey="product-metafields"
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDefinitions.map((definition) => (
            <div key={definition.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`metafield-${definition.id}`}>
                  {definition.name}
                  {definition.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {definition.helpText && (
                  <div className="group relative">
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 text-xs bg-popover border rounded-lg shadow-lg z-10">
                      {definition.helpText}
                    </div>
                  </div>
                )}
              </div>
              {renderField(definition)}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

export default MetafieldsSection;
