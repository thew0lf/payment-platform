'use client';

import * as React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface TitleDescriptionSectionProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onGenerateDescription?: () => void;
  isGenerating?: boolean;
  defaultOpen?: boolean;
  errors?: {
    name?: string;
    description?: string;
  };
}

/**
 * TitleDescriptionSection - Product name and description with AI generation
 */
export function TitleDescriptionSection({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onGenerateDescription,
  isGenerating = false,
  defaultOpen = true,
  errors,
}: TitleDescriptionSectionProps) {
  return (
    <CollapsibleCard
      title="Title & Description"
      subtitle="Name your product and write a compelling description"
      icon={<FileText className="h-5 w-5" />}
      defaultOpen={defaultOpen}
      storageKey="product-title-description"
    >
      <div className="space-y-4">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="product-name">Product Name</Label>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Ethiopian Yirgacheffe Single Origin"
            className={errors?.name ? 'border-destructive' : ''}
          />
          {errors?.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="product-description">Description</Label>
            {onGenerateDescription && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerateDescription}
                disabled={isGenerating || !name}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            )}
          </div>
          <textarea
            id="product-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe your product in detail. What makes it special?"
            rows={5}
            className={`w-full rounded-lg border ${
              errors?.description ? 'border-destructive' : 'border-border'
            } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
          />
          {errors?.description && (
            <p className="text-sm text-destructive">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {description.length} characters
          </p>
        </div>
      </div>
    </CollapsibleCard>
  );
}

export default TitleDescriptionSection;
