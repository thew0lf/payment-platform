'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Image as ImageIcon,
  DollarSign,
  Layers,
  Video,
  Box,
  Save,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productsApi,
  mediaApi,
  variantsApi,
  variantOptionsApi,
  Product,
  ProductMedia,
  ProductVariant,
  VariantOption,
  UpdateProductInput,
  MediaProcessAction,
  GeneratedDescription,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  ROAST_LEVELS,
} from '@/lib/api/products';
import { MediaUpload, MediaGallery } from '@/components/products';
import { AIDescriptionModal } from '@/components/products/ai-description-modal';
import { AISuggestions } from '@/components/products/ai-suggestions';
import { AIGenerateButton, GrammarCheckInline } from '@/components/products/ai-generate-button';
import { VariantMatrix } from '@/components/products/variant-matrix';
import { BundleEditor } from '@/components/products/bundle-editor';
import { PriceRulesEditor } from '@/components/products/price-rules-editor';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type TabId = 'details' | 'media' | 'pricing' | 'variants' | 'bundles';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'details', label: 'Details', icon: <Package className="w-4 h-4" /> },
  { id: 'media', label: 'Media', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'pricing', label: 'Pricing', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'variants', label: 'Variants', icon: <Layers className="w-4 h-4" /> },
  { id: 'bundles', label: 'Bundles', icon: <Box className="w-4 h-4" /> },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  DRAFT: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { selectedCompanyId } = useHierarchy();

  // Core state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('details');

  // Form state
  const [formData, setFormData] = useState<UpdateProductInput>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [flavorInput, setFlavorInput] = useState('');

  // Media state
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [availableOptions, setAvailableOptions] = useState<VariantOption[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // AI state
  const [showAIModal, setShowAIModal] = useState(false);

  const formatCurrency = useCallback((amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }, []);

  // Fetch product data
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.get(productId, selectedCompanyId || undefined);
      setProduct(data);
      setFormData({
        sku: data.sku,
        name: data.name,
        description: data.description || '',
        category: data.category,
        roastLevel: data.roastLevel || '',
        origin: data.origin || '',
        flavorNotes: data.flavorNotes || [],
        price: data.price,
        costPrice: data.costPrice || undefined,
        compareAtPrice: data.compareAtPrice || undefined,
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
        status: data.status,
        isVisible: data.isVisible,
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
      });
      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to fetch product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId, selectedCompanyId]);

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
      setAvailableOptions(optionsList);
    } catch (err) {
      console.error('Failed to load variants:', err);
    } finally {
      setVariantsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (activeTab === 'media') {
      fetchMedia();
    }
    if (activeTab === 'variants') {
      fetchVariants();
    }
  }, [activeTab, fetchMedia, fetchVariants]);

  // Form handlers
  const updateFormData = (updates: Partial<UpdateProductInput>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await productsApi.update(product.id, formData, selectedCompanyId || undefined);
      await fetchProduct();
      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      await productsApi.delete(product.id, selectedCompanyId || undefined);
      router.push('/products');
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      setError(err.message || 'Failed to delete product');
    }
  };

  // Flavor notes handlers
  const addFlavorNote = () => {
    if (flavorInput.trim() && !formData.flavorNotes?.includes(flavorInput.trim())) {
      updateFormData({
        flavorNotes: [...(formData.flavorNotes || []), flavorInput.trim()],
      });
      setFlavorInput('');
    }
  };

  const removeFlavorNote = (note: string) => {
    updateFormData({
      flavorNotes: formData.flavorNotes?.filter((n) => n !== note) || [],
    });
  };

  // Media handlers
  const handleMediaUpload = async (files: File[]) => {
    if (!productId) return;
    if (files.length === 1) {
      await mediaApi.upload(productId, files[0]);
    } else {
      await mediaApi.uploadMultiple(productId, files);
    }
    await fetchMedia();
  };

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

  const handleMediaUpdate = async (mediaId: string, data: { altText?: string; caption?: string }) => {
    if (!productId) return;
    await mediaApi.update(productId, mediaId, data);
    await fetchMedia();
  };

  const handleMediaProcess = async (mediaId: string, action: MediaProcessAction) => {
    if (!productId) return;
    await mediaApi.process(productId, mediaId, { action });
    await fetchMedia();
  };

  // AI handlers
  const handleAIApply = (result: GeneratedDescription) => {
    updateFormData({
      description: result.description,
      metaTitle: result.metaTitle || formData.metaTitle,
      metaDescription: result.metaDescription || formData.metaDescription,
    });
  };

  const handleApplyCategory = (category: string) => {
    updateFormData({ category });
  };

  const handleApplyTags = (tags: string[]) => {
    updateFormData({ flavorNotes: tags });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !product) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to load product</h3>
          <p className="text-sm text-zinc-500 mb-4">{error}</p>
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
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-white">{product.name}</h1>
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', statusConfig.color)}>
                {statusConfig.label}
              </span>
              {!product.isVisible && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400">
                  <EyeOff className="w-3 h-3" />
                  Hidden
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-1">{product.sku}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 hover:border-red-400/50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-800 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-zinc-500 border-transparent hover:text-white hover:border-zinc-700',
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'media' && media.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-zinc-800 rounded text-xs">
                  {media.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">SKU</label>
                  <Input
                    value={formData.sku || ''}
                    onChange={(e) => updateFormData({ sku: e.target.value })}
                    className="bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    className="bg-zinc-800"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-zinc-400">Description</label>
                  <AIGenerateButton
                    productName={formData.name || ''}
                    currentText={formData.description}
                    companyId={selectedCompanyId || undefined}
                    onOpenGenerateModal={() => setShowAIModal(true)}
                    onApplyText={(text) => updateFormData({ description: text })}
                    size="sm"
                  />
                </div>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  placeholder="Describe your product..."
                />
                {formData.description && (
                  <GrammarCheckInline
                    text={formData.description}
                    onApplyCorrected={(text) => updateFormData({ description: text })}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Category & Status */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">Category & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => updateFormData({ category: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Roast Level</label>
                  <select
                    value={formData.roastLevel || ''}
                    onChange={(e) => updateFormData({ roastLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Select...</option>
                    {ROAST_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => updateFormData({ status: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {PRODUCT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Origin</label>
                <Input
                  value={formData.origin || ''}
                  onChange={(e) => updateFormData({ origin: e.target.value })}
                  placeholder="Ethiopia, Yirgacheffe Region"
                  className="bg-zinc-800"
                />
              </div>

              {/* Flavor Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-400 mb-1">Flavor Notes</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={flavorInput}
                    onChange={(e) => setFlavorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFlavorNote())}
                    placeholder="Add flavor note..."
                    className="bg-zinc-800"
                  />
                  <Button variant="outline" onClick={addFlavorNote}>
                    Add
                  </Button>
                </div>
                {formData.flavorNotes && formData.flavorNotes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.flavorNotes.map((note) => (
                      <span
                        key={note}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300"
                      >
                        {note}
                        <button
                          onClick={() => removeFlavorNote(note)}
                          className="text-zinc-500 hover:text-white"
                        >
                          <span className="sr-only">Remove</span>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              {formData.name && (
                <div className="mt-4">
                  <AISuggestions
                    productName={formData.name}
                    description={formData.description}
                    companyId={selectedCompanyId || undefined}
                    onApplyCategory={handleApplyCategory}
                    onApplyTags={handleApplyTags}
                    currentCategory={formData.category}
                    currentTags={formData.flavorNotes}
                  />
                </div>
              )}

              {/* Visibility */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ isVisible: !formData.isVisible })}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
                    formData.isVisible ? 'bg-cyan-500' : 'bg-zinc-700',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      formData.isVisible ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
                <span className="text-sm text-zinc-300">
                  {formData.isVisible ? 'Visible to customers' : 'Hidden from customers'}
                </span>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">Inventory</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Stock Quantity</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stockQuantity ?? ''}
                    onChange={(e) => updateFormData({ stockQuantity: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800"
                  />
                  {isLowStock && (
                    <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Stock is below threshold
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Low Stock Threshold</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold ?? ''}
                    onChange={(e) => updateFormData({ lowStockThreshold: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Meta Title</label>
                  <Input
                    value={formData.metaTitle || ''}
                    onChange={(e) => updateFormData({ metaTitle: e.target.value })}
                    placeholder="SEO title for search engines"
                    className="bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Meta Description</label>
                  <textarea
                    value={formData.metaDescription || ''}
                    onChange={(e) => updateFormData({ metaDescription: e.target.value })}
                    rows={2}
                    placeholder="SEO description for search engines"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">Upload Media</h3>
              <MediaUpload onUpload={handleMediaUpload} maxFiles={10} />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">
                Media Gallery
                {media.length > 0 && (
                  <span className="text-zinc-500 font-normal ml-2">
                    ({media.length} {media.length === 1 ? 'item' : 'items'})
                  </span>
                )}
              </h3>
              {mediaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
              ) : (
                <MediaGallery
                  media={media}
                  onReorder={handleMediaReorder}
                  onSetPrimary={handleMediaSetPrimary}
                  onDelete={handleMediaDelete}
                  onUpdate={handleMediaUpdate}
                  onProcess={handleMediaProcess}
                />
              )}
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Base Pricing */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-white mb-4">Base Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price ?? ''}
                      onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })}
                      className="pl-7 bg-zinc-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Compare at Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.compareAtPrice ?? ''}
                      onChange={(e) => updateFormData({ compareAtPrice: parseFloat(e.target.value) || undefined })}
                      className="pl-7 bg-zinc-800"
                      placeholder="Original price"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice ?? ''}
                      onChange={(e) => updateFormData({ costPrice: parseFloat(e.target.value) || undefined })}
                      className="pl-7 bg-zinc-800"
                      placeholder="Your cost"
                    />
                  </div>
                </div>
              </div>
              {formData.price && formData.costPrice && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Profit Margin:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(formData.price - formData.costPrice)} (
                      {(((formData.price - formData.costPrice) / formData.price) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Price Rules */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <PriceRulesEditor
                productId={productId}
                productPrice={product.price}
                currency={product.currency}
              />
            </div>
          </div>
        )}

        {/* Variants Tab */}
        {activeTab === 'variants' && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            {variantsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : (
              <VariantMatrix
                productId={productId}
                variants={variants}
                availableOptions={availableOptions}
                onVariantsChange={setVariants}
                productSku={product.sku}
                defaultPrice={product.price}
              />
            )}
          </div>
        )}

        {/* Bundles Tab */}
        {activeTab === 'bundles' && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <BundleEditor
              productId={productId}
              companyId={product.companyId}
              productPrice={product.price}
            />
          </div>
        )}
      </div>

      {/* AI Description Modal */}
      <AIDescriptionModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        productName={formData.name || ''}
        category={formData.category}
        attributes={{
          roastLevel: formData.roastLevel,
          origin: formData.origin,
          flavorNotes: formData.flavorNotes,
        }}
        currentDescription={formData.description}
        onApply={handleAIApply}
        companyId={selectedCompanyId || undefined}
      />
    </div>
  );
}
