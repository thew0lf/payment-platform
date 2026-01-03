'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  EyeOff,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Archive,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useAuth } from '@/contexts/auth-context';
import { hasProPlusPlan } from '@/lib/plan-utils';
import {
  productsApi,
  mediaApi,
  variantsApi,
  categoriesApi,
  aiApi,
  Product,
  ProductMedia,
  ProductVariant,
  VariantOption,
  UpdateProductInput,
  GeneratedDescription,
  Category,
} from '@/lib/api/products';
import { salesChannelsApi, SalesChannel, ProductSalesChannel } from '@/lib/api/sales-channels';
import {
  categoryMetafieldsApi,
  CategoryMetafieldDefinition,
  ProductMetafieldValue,
} from '@/lib/api/category-metafields';
import { AIDescriptionModal } from '@/components/products/ai-description-modal';
import {
  TitleDescriptionSection,
  MediaSection,
  PricingSection,
  InventorySection,
  VariantsSection,
  OrganizationSection,
  MetafieldsSection,
  ChannelsSection,
  SeoSection,
  AdditionalDetailsSection,
} from '@/components/products/sections';
import { MediaUpload } from '@/components/products/media-upload';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FormState {
  sku: string;
  name: string;
  description: string;
  categoryIds: string[];
  tagIds: string[];
  collectionIds: string[];
  vendor: string;
  productType: string;
  price: number;
  costPrice?: number;
  compareAtPrice?: number;
  currency: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  status: string;
  isVisible: boolean;
  metaTitle: string;
  metaDescription: string;
  seoSlug: string;
  weight?: number;
  weightUnit: 'g' | 'kg' | 'oz' | 'lb';
  fulfillmentType: 'SHIP' | 'PICKUP' | 'DIGITAL' | 'SERVICE';
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: any }
  | { type: 'SET_MULTIPLE'; updates: Partial<FormState> }
  | { type: 'RESET'; state: FormState };

const initialFormState: FormState = {
  sku: '',
  name: '',
  description: '',
  categoryIds: [],
  tagIds: [],
  collectionIds: [],
  vendor: '',
  productType: '',
  price: 0,
  currency: 'USD',
  stockQuantity: 0,
  lowStockThreshold: 5,
  trackInventory: true,
  status: 'DRAFT',
  isVisible: true,
  metaTitle: '',
  metaDescription: '',
  seoSlug: '',
  weightUnit: 'oz',
  fulfillmentType: 'SHIP',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_MULTIPLE':
      return { ...state, ...action.updates };
    case 'RESET':
      return action.state;
    default:
      return state;
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  DRAFT: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border' },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { selectedCompanyId } = useHierarchy();
  const { user } = useAuth();

  // Check if user has Pro+ plan for AI features
  const userPlan = user?.client?.plan;
  const hasAIAccess = hasProPlusPlan(userPlan);

  // Core state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const [originalState, setOriginalState] = useState<FormState>(initialFormState);
  const [hasChanges, setHasChanges] = useState(false);

  // Related data
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [collections, setCollections] = useState<{ id: string; name: string; slug: string }[]>([]);

  // Channels
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [productChannels, setProductChannels] = useState<ProductSalesChannel[]>([]);

  // Metafields
  const [metafieldDefinitions, setMetafieldDefinitions] = useState<CategoryMetafieldDefinition[]>([]);
  const [productMetafields, setProductMetafields] = useState<ProductMetafieldValue[]>([]);

  // Media state
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // UI state
  const [showAIModal, setShowAIModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Detect changes
  useEffect(() => {
    const changed = JSON.stringify(formState) !== JSON.stringify(originalState);
    setHasChanges(changed);
  }, [formState, originalState]);

  // Form update helpers
  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const updateMultiple = useCallback((updates: Partial<FormState>) => {
    dispatch({ type: 'SET_MULTIPLE', updates });
  }, []);

  // Fetch product data
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.get(productId, selectedCompanyId || undefined);
      setProduct(data);

      const newState: FormState = {
        sku: data.sku,
        name: data.name,
        description: data.description || '',
        categoryIds: data.categories?.map((c) => c.id) || [],
        tagIds: [],
        collectionIds: [],
        vendor: '',
        productType: '',
        price: data.price,
        costPrice: data.costPrice || undefined,
        compareAtPrice: data.compareAtPrice || undefined,
        currency: data.currency || 'USD',
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
        trackInventory: data.trackInventory ?? true,
        status: data.status,
        isVisible: data.isVisible,
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        seoSlug: data.slug || '',
        weight: data.weight || undefined,
        weightUnit: 'oz',
        fulfillmentType: 'SHIP',
      };

      dispatch({ type: 'RESET', state: newState });
      setOriginalState(newState);
    } catch (err: any) {
      console.error('Failed to fetch product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId, selectedCompanyId]);

  // Fetch related data
  const fetchRelatedData = useCallback(async () => {
    try {
      const categoriesData = await categoriesApi.list(false, selectedCompanyId || undefined);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [selectedCompanyId]);

  const fetchMedia = useCallback(async () => {
    if (!productId) return;
    setMediaLoading(true);
    try {
      const mediaList = await mediaApi.list(productId);
      setMedia(mediaList);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setMediaLoading(false);
    }
  }, [productId]);

  const fetchVariants = useCallback(async () => {
    if (!productId) return;
    setVariantsLoading(true);
    try {
      const [variantsList, optionsList] = await Promise.all([
        variantsApi.list(productId),
        variantsApi.getAvailableOptions(productId),
      ]);
      setVariants(variantsList);
      setVariantOptions(optionsList);
    } catch (err) {
      console.error('Failed to load variants:', err);
    } finally {
      setVariantsLoading(false);
    }
  }, [productId]);

  const fetchChannels = useCallback(async () => {
    if (!productId) return;
    try {
      const [channelsList, productChannelsList] = await Promise.all([
        salesChannelsApi.list({ companyId: selectedCompanyId || undefined }),
        salesChannelsApi.getProductChannels(productId, selectedCompanyId || undefined),
      ]);
      setChannels(channelsList);
      setProductChannels(productChannelsList);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  }, [productId, selectedCompanyId]);

  const fetchMetafields = useCallback(async () => {
    if (!productId || formState.categoryIds.length === 0) return;
    try {
      const primaryCategoryId = formState.categoryIds[0];
      const [definitions, values] = await Promise.all([
        categoryMetafieldsApi.listDefinitions(primaryCategoryId, selectedCompanyId || undefined),
        categoryMetafieldsApi.getProductMetafields(productId, selectedCompanyId || undefined),
      ]);
      setMetafieldDefinitions(definitions);
      setProductMetafields(values);
    } catch (err) {
      console.error('Failed to load metafields:', err);
    }
  }, [productId, formState.categoryIds, selectedCompanyId]);

  useEffect(() => {
    fetchProduct();
    fetchRelatedData();
  }, [fetchProduct, fetchRelatedData]);

  useEffect(() => {
    fetchMedia();
    fetchVariants();
    fetchChannels();
  }, [fetchMedia, fetchVariants, fetchChannels]);

  useEffect(() => {
    fetchMetafields();
  }, [fetchMetafields]);

  // Save handler
  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateProductInput = {
        sku: formState.sku,
        name: formState.name,
        description: formState.description,
        categoryIds: formState.categoryIds,
        price: formState.price,
        costPrice: formState.costPrice,
        compareAtPrice: formState.compareAtPrice,
        stockQuantity: formState.stockQuantity,
        lowStockThreshold: formState.lowStockThreshold,
        status: formState.status,
        isVisible: formState.isVisible,
        metaTitle: formState.metaTitle,
        metaDescription: formState.metaDescription,
      };

      await productsApi.update(product.id, payload, selectedCompanyId || undefined);
      await fetchProduct();
      toast.success('Product saved successfully');
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setError(err.message || 'Failed to save product');
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    try {
      await productsApi.delete(product.id, selectedCompanyId || undefined);
      toast.success('Product deleted successfully');
      router.push('/products');
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      toast.error('Failed to delete product');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleArchive = async () => {
    if (!product) return;
    try {
      await productsApi.update(product.id, { status: 'ARCHIVED' }, selectedCompanyId || undefined);
      await fetchProduct();
      toast.success('Product archived');
    } catch (err: any) {
      console.error('Failed to archive product:', err);
      toast.error('Failed to archive product');
    }
  };

  // Media handlers
  const handleMediaReorder = async (mediaIds: string[]) => {
    if (!productId) return;
    await mediaApi.reorder(productId, mediaIds);
    await fetchMedia();
  };

  const handleMediaSetPrimary = async (mediaId: string) => {
    if (!productId) return;
    await mediaApi.setAsPrimary(productId, mediaId);
    await fetchMedia();
  };

  const handleMediaDelete = async (mediaId: string) => {
    if (!productId) return;
    await mediaApi.delete(productId, mediaId);
    await fetchMedia();
  };

  // Handle media upload
  const handleMediaUpload = async (files: File[]) => {
    if (!productId) return;
    setIsUploading(true);
    try {
      await mediaApi.uploadMultiple(productId, files);
      await fetchMedia();
      setShowUploadModal(false);
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`);
    } catch (err: any) {
      console.error('Failed to upload media:', err);
      toast.error(err.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  // Channel handlers
  const handleChannelToggle = async (channelId: string, isPublished: boolean) => {
    try {
      if (isPublished) {
        await salesChannelsApi.publishProduct(
          productId,
          { channelId, isPublished: true },
          selectedCompanyId || undefined
        );
      } else {
        await salesChannelsApi.unpublishProduct(productId, channelId, selectedCompanyId || undefined);
      }
      await fetchChannels();
    } catch (err) {
      console.error('Failed to toggle channel:', err);
      toast.error('Failed to update channel');
    }
  };

  // AI handlers
  const handleAIApply = (result: GeneratedDescription) => {
    updateMultiple({
      description: result.description,
      metaTitle: result.metaTitle || formState.metaTitle,
      metaDescription: result.metaDescription || formState.metaDescription,
    });
  };

  // Generate SEO meta title and description using AI
  const handleGenerateSEO = async () => {
    if (!hasAIAccess) {
      toast.error('AI features require a Pro+ plan');
      return;
    }

    // Use the meta description if available, otherwise use the product description
    const sourceContent = formState.metaDescription || formState.description;
    if (!sourceContent && !formState.name) {
      toast.error('Please add a product name and description first');
      return;
    }

    setIsGeneratingSEO(true);
    try {
      const result = await aiApi.generateDescription({
        productName: formState.name,
        category: selectedCategories[0]?.slug,
        attributes: {
          existingDescription: formState.description,
          existingMetaDescription: formState.metaDescription,
        },
        tone: 'professional',
        length: 'short',
        includeSEO: true,
        companyId: selectedCompanyId || undefined,
      });

      if (result.metaTitle || result.metaDescription) {
        updateMultiple({
          metaTitle: result.metaTitle || formState.metaTitle,
          metaDescription: result.metaDescription || formState.metaDescription,
        });
        toast.success('SEO content generated successfully');
      } else {
        toast.error('No SEO content was generated');
      }
    } catch (err: any) {
      console.error('Failed to generate SEO content:', err);
      toast.error(err.message || 'Failed to generate SEO content');
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  // Convert data for section components
  const selectedCategories = formState.categoryIds.map((id, index) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? { id: cat.id, name: cat.name, slug: cat.slug, isPrimary: index === 0 } : null;
  }).filter(Boolean) as { id: string; name: string; slug: string; isPrimary?: boolean }[];

  const selectedTags = formState.tagIds.map((id) => {
    const tag = tags.find((t) => t.id === id);
    return tag ? { id: tag.id, name: tag.name, slug: tag.slug } : null;
  }).filter(Boolean) as { id: string; name: string; slug: string }[];

  const selectedCollections = formState.collectionIds.map((id) => {
    const col = collections.find((c) => c.id === id);
    return col ? { id: col.id, name: col.name, slug: col.slug } : null;
  }).filter(Boolean) as { id: string; name: string; slug: string }[];

  const mediaItems = media.map((m) => ({
    id: m.id,
    url: m.url,
    alt: m.altText,
    isPrimary: m.isPrimary,
  }));

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !product) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Failed to load product</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/products')}>
              Back to Products
            </Button>
            <Button onClick={fetchProduct}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const statusConfig = STATUS_CONFIG[product.status] || STATUS_CONFIG.DRAFT;
  const isLowStock = product.trackInventory && product.stockQuantity <= product.lowStockThreshold;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{product.name}</h1>
              <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              {!product.isVisible && (
                <Badge variant="secondary" className="text-xs">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hidden
                </Badge>
              )}
              {isLowStock && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Low Stock
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{product.sku}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unsaved changes
            </span>
          )}

          {/* Actions dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-popover border rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => {
                      handleArchive();
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-4">
        {/* Title & Description */}
        <TitleDescriptionSection
          name={formState.name}
          description={formState.description}
          onNameChange={(value) => updateField('name', value)}
          onDescriptionChange={(value) => updateField('description', value)}
          onGenerateDescription={hasAIAccess ? () => setShowAIModal(true) : undefined}
          isGenerating={isGeneratingDescription}
          defaultOpen
        />

        {/* Media */}
        <MediaSection
          images={mediaItems}
          onImagesChange={() => {}}
          onUpload={() => setShowUploadModal(true)}
          onRemove={handleMediaDelete}
          onSetPrimary={handleMediaSetPrimary}
          onReorder={(images) => handleMediaReorder(images.map((i) => i.id))}
          isUploading={mediaLoading || isUploading}
          defaultOpen
        />

        {/* Pricing */}
        <PricingSection
          price={formState.price}
          compareAtPrice={formState.compareAtPrice}
          costPrice={formState.costPrice}
          currency={formState.currency}
          onPriceChange={(value) => updateField('price', typeof value === 'string' ? parseFloat(value) || 0 : value)}
          onCompareAtPriceChange={(value) => updateField('compareAtPrice', typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value)}
          onCostPriceChange={(value) => updateField('costPrice', typeof value === 'string' ? (value ? parseFloat(value) : undefined) : value)}
          defaultOpen
        />

        {/* Inventory */}
        <InventorySection
          sku={formState.sku}
          trackInventory={formState.trackInventory}
          stockQuantity={formState.stockQuantity}
          lowStockThreshold={formState.lowStockThreshold}
          onSkuChange={(value) => updateField('sku', value)}
          onTrackInventoryChange={(value) => updateField('trackInventory', value)}
          onStockQuantityChange={(value) => updateField('stockQuantity', value)}
          onLowStockThresholdChange={(value) => updateField('lowStockThreshold', value)}
        />

        {/* Variants */}
        <VariantsSection
          variants={variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name || 'Default',
            price: v.price || formState.price,
            compareAtPrice: v.compareAtPrice,
            options: {},
            stockQuantity: 0,
            isActive: v.isActive,
          }))}
          options={variantOptions.map((o) => ({
            id: o.id,
            name: o.name,
            values: o.values.map((v) => typeof v === 'string' ? v : v.value),
          }))}
          onVariantsChange={() => fetchVariants()}
          onOptionsChange={() => fetchVariants()}
          basePrice={formState.price}
          isLoading={variantsLoading}
        />

        {/* Organization */}
        <OrganizationSection
          categories={selectedCategories}
          tags={selectedTags}
          collections={selectedCollections}
          vendor={formState.vendor}
          productType={formState.productType}
          availableCategories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          availableTags={tags}
          availableCollections={collections}
          onCategoriesChange={(cats) => updateField('categoryIds', cats.map((c) => c.id))}
          onTagsChange={(t) => updateField('tagIds', t.map((tag) => tag.id))}
          onCollectionsChange={(cols) => updateField('collectionIds', cols.map((c) => c.id))}
          onVendorChange={(value) => updateField('vendor', value)}
          onProductTypeChange={(value) => updateField('productType', value)}
        />

        {/* Metafields */}
        {metafieldDefinitions.length > 0 && (
          <MetafieldsSection
            definitions={metafieldDefinitions}
            values={productMetafields}
            onValuesChange={(values) => setProductMetafields(values)}
          />
        )}

        {/* Sales Channels */}
        {channels.length > 0 && (
          <ChannelsSection
            channels={channels}
            productChannels={productChannels}
            onChannelToggle={handleChannelToggle}
          />
        )}

        {/* SEO */}
        <SeoSection
          metaTitle={formState.metaTitle}
          metaDescription={formState.metaDescription}
          slug={formState.seoSlug}
          productName={formState.name}
          productDescription={formState.description}
          category={selectedCategories[0]?.slug}
          onMetaTitleChange={(value) => updateField('metaTitle', value)}
          onMetaDescriptionChange={(value) => updateField('metaDescription', value)}
          onSlugChange={(value) => updateField('seoSlug', value)}
          showAIFeatures={hasAIAccess}
          isGeneratingSEO={isGeneratingSEO}
          onGenerateSEO={handleGenerateSEO}
        />

        {/* Additional Details */}
        <AdditionalDetailsSection
          weight={formState.weight}
          weightUnit={formState.weightUnit}
          fulfillmentType={formState.fulfillmentType}
          onWeightChange={(value) => updateField('weight', value)}
          onWeightUnitChange={(value) => updateField('weightUnit', value)}
          onFulfillmentTypeChange={(value) => updateField('fulfillmentType', value)}
        />
      </div>

      {/* AI Description Modal */}
      <AIDescriptionModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        productName={formState.name}
        category={selectedCategories[0]?.slug}
        attributes={{
          sku: formState.sku,
          price: formState.price,
          currency: formState.currency,
          ...(formState.weight && { weight: `${formState.weight} ${formState.weightUnit}` }),
          ...(formState.compareAtPrice && { compareAtPrice: formState.compareAtPrice }),
          ...(formState.vendor && { vendor: formState.vendor }),
          ...(formState.productType && { productType: formState.productType }),
          ...(selectedCategories.length > 0 && { categories: selectedCategories.map(c => c.name).join(', ') }),
          ...(selectedTags.length > 0 && { tags: selectedTags.map(t => t.name).join(', ') }),
        }}
        currentDescription={formState.description}
        onApply={handleAIApply}
        companyId={selectedCompanyId || undefined}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md mx-4 shadow-xl border">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Product?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Product
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Media Modal */}
      {showUploadModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-lg mx-4 shadow-xl border w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Upload Images</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                ✕
              </Button>
            </div>
            <MediaUpload
              onUpload={handleMediaUpload}
              maxFiles={10 - media.length}
              disabled={isUploading}
            />
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
