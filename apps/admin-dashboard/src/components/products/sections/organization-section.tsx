'use client';

import * as React from 'react';
import { FolderOpen, Tags, Library, Building2, X } from 'lucide-react';
import { CollapsibleCard, CollapsibleCardSection } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  isPrimary?: boolean;
}

interface TagInfo {
  id: string;
  name: string;
  slug: string;
}

interface CollectionInfo {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationSectionProps {
  categories: CategoryInfo[];
  tags: TagInfo[];
  collections: CollectionInfo[];
  vendor?: string;
  productType?: string;
  availableCategories?: CategoryInfo[];
  availableTags?: TagInfo[];
  availableCollections?: CollectionInfo[];
  onCategoriesChange: (categories: CategoryInfo[]) => void;
  onTagsChange: (tags: TagInfo[]) => void;
  onCollectionsChange: (collections: CollectionInfo[]) => void;
  onVendorChange?: (value: string) => void;
  onProductTypeChange?: (value: string) => void;
  onSetPrimaryCategory?: (categoryId: string) => void;
  defaultOpen?: boolean;
}

/**
 * OrganizationSection - Categories, tags, vendor, and collections
 */
export function OrganizationSection({
  categories,
  tags,
  collections,
  vendor,
  productType,
  availableCategories = [],
  availableTags = [],
  availableCollections = [],
  onCategoriesChange,
  onTagsChange,
  onCollectionsChange,
  onVendorChange,
  onProductTypeChange,
  onSetPrimaryCategory,
  defaultOpen = false,
}: OrganizationSectionProps) {
  const [categorySearch, setCategorySearch] = React.useState('');
  const [tagSearch, setTagSearch] = React.useState('');
  const [collectionSearch, setCollectionSearch] = React.useState('');

  // Refs for click-outside handling
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);
  const collectionDropdownRef = React.useRef<HTMLDivElement>(null);

  // Click-outside handler with cleanup to prevent memory leaks
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categorySearch && categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setCategorySearch('');
      }
      if (tagSearch && tagDropdownRef.current && !tagDropdownRef.current.contains(target)) {
        setTagSearch('');
      }
      if (collectionSearch && collectionDropdownRef.current && !collectionDropdownRef.current.contains(target)) {
        setCollectionSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categorySearch, tagSearch, collectionSearch]);

  // Filter available items by search
  const filteredCategories = availableCategories.filter(
    (c) =>
      c.name.toLowerCase().includes(categorySearch.toLowerCase()) &&
      !categories.some((selected) => selected.id === c.id)
  );

  const filteredTags = availableTags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !tags.some((selected) => selected.id === t.id)
  );

  const filteredCollections = availableCollections.filter(
    (c) =>
      c.name.toLowerCase().includes(collectionSearch.toLowerCase()) &&
      !collections.some((selected) => selected.id === c.id)
  );

  const removeCategory = (id: string) => {
    onCategoriesChange(categories.filter((c) => c.id !== id));
  };

  const removeTag = (id: string) => {
    onTagsChange(tags.filter((t) => t.id !== id));
  };

  const removeCollection = (id: string) => {
    onCollectionsChange(collections.filter((c) => c.id !== id));
  };

  const addCategory = (category: CategoryInfo) => {
    const newCategories = [...categories, category];
    // If this is the first category, make it primary
    if (categories.length === 0) {
      newCategories[0] = { ...newCategories[0], isPrimary: true };
    }
    onCategoriesChange(newCategories);
    setCategorySearch('');
  };

  const addTag = (tag: TagInfo) => {
    onTagsChange([...tags, tag]);
    setTagSearch('');
  };

  const addCollection = (collection: CollectionInfo) => {
    onCollectionsChange([...collections, collection]);
    setCollectionSearch('');
  };

  const setPrimary = (categoryId: string) => {
    if (onSetPrimaryCategory) {
      onSetPrimaryCategory(categoryId);
    } else {
      onCategoriesChange(
        categories.map((c) => ({
          ...c,
          isPrimary: c.id === categoryId,
        }))
      );
    }
  };

  return (
    <CollapsibleCard
      title="Organization"
      subtitle="Categorize your product for easy discovery"
      icon={<FolderOpen className="h-5 w-5" />}
      badge={
        categories.length + tags.length + collections.length > 0 ? (
          <Badge variant="secondary">
            {categories.length + tags.length + collections.length} items
          </Badge>
        ) : undefined
      }
      defaultOpen={defaultOpen}
      storageKey="product-organization"
    >
      <div className="space-y-6">
        {/* Categories */}
        <CollapsibleCardSection title="Categories">
          <div className="space-y-3">
            {/* Selected categories */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={category.isPrimary ? 'default' : 'secondary'}
                    className="pr-1 cursor-pointer"
                    onClick={() =>
                      !category.isPrimary && setPrimary(category.id)
                    }
                  >
                    {category.name}
                    {category.isPrimary && (
                      <span className="ml-1 text-xs">(Primary)</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCategory(category.id);
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-background/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Category search/add */}
            <div className="relative" ref={categoryDropdownRef}>
              <Input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Find or create category..."
              />
              {categorySearch && filteredCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCategories.slice(0, 10).map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => addCategory(category)}
                      className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleCardSection>

        {/* Tags */}
        <CollapsibleCardSection title="Tags">
          <div className="space-y-3">
            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="pr-1">
                    <Tags className="h-3 w-3 mr-1" />
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="ml-1 p-0.5 rounded-full hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag search/add */}
            <div className="relative" ref={tagDropdownRef}>
              <Input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Find or create tag..."
              />
              {tagSearch && filteredTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleCardSection>

        {/* Collections */}
        <CollapsibleCardSection title="Collections">
          <div className="space-y-3">
            {/* Selected collections */}
            {collections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collections.map((collection) => (
                  <Badge key={collection.id} variant="outline" className="pr-1">
                    <Library className="h-3 w-3 mr-1" />
                    {collection.name}
                    <button
                      type="button"
                      onClick={() => removeCollection(collection.id)}
                      className="ml-1 p-0.5 rounded-full hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Collection search/add */}
            <div className="relative" ref={collectionDropdownRef}>
              <Input
                value={collectionSearch}
                onChange={(e) => setCollectionSearch(e.target.value)}
                placeholder="Find or add to collection..."
              />
              {collectionSearch && filteredCollections.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCollections.slice(0, 10).map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => addCollection(collection)}
                      className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                    >
                      {collection.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleCardSection>

        {/* Vendor and Product Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vendor" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Vendor
            </Label>
            <Input
              id="vendor"
              value={vendor || ''}
              onChange={(e) => onVendorChange?.(e.target.value)}
              placeholder="e.g., Ethiopian Coffee Co."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-type">Product Type</Label>
            <Input
              id="product-type"
              value={productType || ''}
              onChange={(e) => onProductTypeChange?.(e.target.value)}
              placeholder="e.g., Coffee, Tea, Equipment"
            />
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}

export default OrganizationSection;
