'use client';

import * as React from 'react';
import { Search, Eye, Smartphone, Monitor, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { CollapsibleCard, CollapsibleCardSection } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SeoSectionProps {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  siteUrl?: string;
  productName?: string;
  productDescription?: string;
  category?: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  defaultOpen?: boolean;
  errors?: {
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
  };
  // AI features
  showAIFeatures?: boolean;
  isGeneratingSEO?: boolean;
  onGenerateSEO?: () => void;
}

/**
 * SeoSection - Meta title, description, slug, and live Google preview
 */
export function SeoSection({
  metaTitle,
  metaDescription,
  slug,
  siteUrl = 'https://yourstore.com',
  productName = 'Product',
  productDescription,
  category,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onSlugChange,
  defaultOpen = false,
  errors,
  showAIFeatures = false,
  isGeneratingSEO = false,
  onGenerateSEO,
}: SeoSectionProps) {
  const [previewMode, setPreviewMode] = React.useState<'desktop' | 'mobile'>('desktop');

  // Character limits
  const TITLE_MAX = 60;
  const DESCRIPTION_MAX = 160;

  // Use product name as fallback for preview
  const displayTitle = metaTitle || productName;
  const displayDescription =
    metaDescription || 'Add a meta description to improve search visibility.';
  const displayUrl = `${siteUrl}/products/${slug || 'product-slug'}`;

  // Truncate for preview
  const truncateTitle = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.substring(0, max - 3) + '...';
  };

  const truncateDescription = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.substring(0, max - 3) + '...';
  };

  const titleWarning = metaTitle.length > TITLE_MAX;
  const descriptionWarning = metaDescription.length > DESCRIPTION_MAX;

  // Generate slug from title
  const generateSlug = () => {
    const newSlug = (metaTitle || productName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    onSlugChange(newSlug);
  };

  const getSeoScore = () => {
    let score = 0;
    if (metaTitle && metaTitle.length >= 30 && metaTitle.length <= TITLE_MAX) score += 40;
    else if (metaTitle) score += 20;
    if (metaDescription && metaDescription.length >= 120 && metaDescription.length <= DESCRIPTION_MAX) score += 40;
    else if (metaDescription) score += 20;
    if (slug) score += 20;
    return score;
  };

  const seoScore = getSeoScore();

  return (
    <CollapsibleCard
      title="Search Engine Listing"
      subtitle="Preview how this product appears in search results"
      icon={<Search className="h-5 w-5" />}
      badge={
        <div className="flex items-center gap-2">
          {showAIFeatures && onGenerateSEO && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateSEO();
              }}
              disabled={isGeneratingSEO || !productName}
              className="gap-1.5 h-7 text-xs"
            >
              {isGeneratingSEO ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isGeneratingSEO ? 'Generating...' : 'AI Generate'}
            </Button>
          )}
          <Badge
            variant={seoScore >= 80 ? 'default' : seoScore >= 50 ? 'secondary' : 'destructive'}
          >
            SEO: {seoScore}%
          </Badge>
        </div>
      }
      defaultOpen={defaultOpen}
      storageKey="product-seo"
    >
      <div className="space-y-6">
        {/* Google Preview */}
        <CollapsibleCardSection title="Search Preview">
          <div className="space-y-3">
            {/* Preview mode toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded-lg transition-colors ${
                  previewMode === 'desktop'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded-lg transition-colors ${
                  previewMode === 'mobile'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground ml-2">
                {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} Preview
              </span>
            </div>

            {/* Google search result preview */}
            <div
              className={`p-4 rounded-lg bg-white border shadow-sm ${
                previewMode === 'mobile' ? 'max-w-[360px]' : 'max-w-[600px]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm text-gray-600">{siteUrl}</span>
              </div>
              <h3 className="text-lg text-[#1a0dab] hover:underline cursor-pointer font-normal">
                {truncateTitle(displayTitle, previewMode === 'mobile' ? 50 : TITLE_MAX)}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {truncateDescription(
                  displayDescription,
                  previewMode === 'mobile' ? 120 : DESCRIPTION_MAX
                )}
              </p>
            </div>
          </div>
        </CollapsibleCardSection>

        {/* Meta Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="meta-title">Meta Title</Label>
            <span
              className={`text-xs ${
                titleWarning ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {metaTitle.length}/{TITLE_MAX}
            </span>
          </div>
          <Input
            id="meta-title"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder={productName || 'Enter meta title...'}
            className={errors?.metaTitle || titleWarning ? 'border-destructive' : ''}
          />
          {errors?.metaTitle && (
            <p className="text-sm text-destructive">{errors.metaTitle}</p>
          )}
          {titleWarning && !errors?.metaTitle && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Title is too long and may be truncated in search results
            </p>
          )}
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="meta-description">Meta Description</Label>
            <span
              className={`text-xs ${
                descriptionWarning ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {metaDescription.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id="meta-description"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Write a compelling description that encourages clicks..."
            rows={3}
            className={`w-full rounded-lg border ${
              errors?.metaDescription || descriptionWarning
                ? 'border-destructive'
                : 'border-border'
            } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
          />
          {errors?.metaDescription && (
            <p className="text-sm text-destructive">{errors.metaDescription}</p>
          )}
          {descriptionWarning && !errors?.metaDescription && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Description is too long and may be truncated in search results
            </p>
          )}
        </div>

        {/* URL Handle/Slug */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="slug">URL Handle</Label>
            <button
              type="button"
              onClick={generateSlug}
              className="text-xs text-primary hover:underline"
            >
              Generate from title
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {siteUrl}/products/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="product-slug"
              className={`flex-1 ${errors?.slug ? 'border-destructive' : ''}`}
            />
          </div>
          {errors?.slug && (
            <p className="text-sm text-destructive">{errors.slug}</p>
          )}
        </div>

        {/* SEO Tips */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" />
            SEO Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className={metaTitle.length >= 30 && metaTitle.length <= TITLE_MAX ? 'text-green-600' : ''}>
              {metaTitle.length >= 30 && metaTitle.length <= TITLE_MAX ? '✓' : '○'} Title between 30-60 characters
            </li>
            <li className={metaDescription.length >= 120 && metaDescription.length <= DESCRIPTION_MAX ? 'text-green-600' : ''}>
              {metaDescription.length >= 120 && metaDescription.length <= DESCRIPTION_MAX ? '✓' : '○'} Description between 120-160 characters
            </li>
            <li className={slug ? 'text-green-600' : ''}>
              {slug ? '✓' : '○'} URL handle is set
            </li>
          </ul>
        </div>
      </div>
    </CollapsibleCard>
  );
}

export default SeoSection;
