'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, Plus, Check, X, Tag, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi, CategorySuggestion } from '@/lib/api/products';
import { cn } from '@/lib/utils';

interface AISuggestionsProps {
  productName: string;
  description?: string;
  companyId?: string;
  onApplyCategory?: (category: string, subcategory?: string) => void;
  onApplyTags?: (tags: string[]) => void;
  currentCategory?: string;
  currentTags?: string[];
  className?: string;
}

export function AISuggestions({
  productName,
  description,
  companyId,
  onApplyCategory,
  onApplyTags,
  currentCategory,
  currentTags = [],
  className,
}: AISuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CategorySuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedCategory, setAppliedCategory] = useState(false);
  const [appliedTags, setAppliedTags] = useState<Set<string>>(new Set());

  const handleGetSuggestions = useCallback(async () => {
    if (!productName) return;

    setIsLoading(true);
    setError(null);
    setAppliedCategory(false);
    setAppliedTags(new Set());

    try {
      const result = await aiApi.suggestCategory({
        productName,
        description,
        companyId,
      });
      setSuggestions(result);
    } catch (err: any) {
      setError(err.message || 'Failed to get suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [productName, description, companyId]);

  const handleApplyCategory = useCallback(() => {
    if (suggestions && onApplyCategory) {
      onApplyCategory(suggestions.category, suggestions.subcategory);
      setAppliedCategory(true);
    }
  }, [suggestions, onApplyCategory]);

  const handleApplyTag = useCallback(
    (tag: string) => {
      if (onApplyTags) {
        const newTags = [...currentTags, tag];
        onApplyTags(newTags);
        setAppliedTags((prev) => new Set(prev).add(tag));
      }
    },
    [onApplyTags, currentTags]
  );

  const handleApplyAllTags = useCallback(() => {
    if (suggestions?.tags && onApplyTags) {
      const newTags = [
        ...currentTags,
        ...suggestions.tags.filter((t) => !currentTags.includes(t)),
      ];
      onApplyTags(newTags);
      setAppliedTags(new Set(suggestions.tags));
    }
  }, [suggestions, onApplyTags, currentTags]);

  const handleDismiss = useCallback(() => {
    setSuggestions(null);
    setError(null);
    setAppliedCategory(false);
    setAppliedTags(new Set());
  }, []);

  // Don't show if no product name
  if (!productName) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Trigger Button */}
      {!suggestions && !isLoading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetSuggestions}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4" />
          Suggest Category & Tags
        </Button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Getting AI suggestions...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-sm text-red-400">{error}</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 hover:bg-red-500/20 rounded"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggestions
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Category Suggestion */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              Category
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-foreground">{suggestions.category}</span>
                {suggestions.subcategory && (
                  <span className="text-muted-foreground"> / {suggestions.subcategory}</span>
                )}
              </div>
              {onApplyCategory && (
                <Button
                  type="button"
                  size="sm"
                  variant={appliedCategory ? 'ghost' : 'outline'}
                  onClick={handleApplyCategory}
                  disabled={appliedCategory || currentCategory === suggestions.category}
                  className={cn(
                    'gap-1.5',
                    appliedCategory && 'text-green-400'
                  )}
                >
                  {appliedCategory ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Applied
                    </>
                  ) : currentCategory === suggestions.category ? (
                    'Current'
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Apply
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Tags Suggestions */}
          {suggestions.tags && suggestions.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Tags
                </div>
                {onApplyTags && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleApplyAllTags}
                    disabled={suggestions.tags.every(
                      (t) => currentTags.includes(t) || appliedTags.has(t)
                    )}
                    className="text-xs h-7 px-2"
                  >
                    Apply All
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.tags.map((tag) => {
                  const isApplied = appliedTags.has(tag);
                  const isExisting = currentTags.includes(tag);

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => !isApplied && !isExisting && handleApplyTag(tag)}
                      disabled={isApplied || isExisting || !onApplyTags}
                      className={cn(
                        'px-2.5 py-1 text-sm rounded-full border transition-colors flex items-center gap-1.5',
                        isApplied
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : isExisting
                            ? 'border-border bg-muted/50 text-muted-foreground cursor-default'
                            : 'border-border hover:border-primary/50 hover:bg-primary/10 text-foreground'
                      )}
                    >
                      {isApplied && <Check className="h-3 w-3" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
