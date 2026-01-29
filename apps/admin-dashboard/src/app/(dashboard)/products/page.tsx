'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  Package,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Edit,
  MoreHorizontal,
  X,
  Building2,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productsApi,
  mediaApi,
  categoriesApi,
  Product,
  ProductMedia,
  ProductQueryParams,
  CreateProductInput,
  UpdateProductInput,
  MediaProcessAction,
  GeneratedDescription,
  Category,
  PRODUCT_STATUSES,
} from '@/lib/api/products';
import { MediaUpload, MediaGallery } from '@/components/products';
import { AIDescriptionModal } from '@/components/products/ai-description-modal';
import { AISuggestions } from '@/components/products/ai-suggestions';
import { AIGenerateButton, GrammarCheckInline } from '@/components/products/ai-generate-button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  DRAFT: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// PRODUCT MODAL
// ═══════════════════════════════════════════════════════════════

type ModalTab = 'details' | 'media';

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (data: CreateProductInput | UpdateProductInput) => Promise<void>;
  onRefresh?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// QUICK CATEGORY MODAL (inline for creating categories from products page)
// ═══════════════════════════════════════════════════════════════

interface QuickCategoryModalProps {
  onClose: () => void;
  onCreated: (category: Category) => void;
  companyId: string;
}

function QuickCategoryModal({ onClose, onCreated, companyId }: QuickCategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newCategory = await categoriesApi.create({ name: name.trim(), description }, companyId);
      toast.success(`Category "${name}" created`);
      onCreated(newCategory);
      onClose();
    } catch (err) {
      console.error('Failed to create category:', err);
      toast.error('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-20 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:w-full z-[60]">
        <div className="h-auto bg-card border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Quick Add Category</h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Optional description..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Create Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function ProductModal({ product, onClose, onSave, onRefresh }: ProductModalProps) {
  const { selectedCompanyId } = useHierarchy();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('details');
  const [formData, setFormData] = useState<CreateProductInput>({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    categoryIds: (product as any)?.categories?.map((c: any) => c.id) || [],
    flavorNotes: product?.flavorNotes || [],
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stockQuantity: product?.stockQuantity || 0,
    lowStockThreshold: product?.lowStockThreshold || 10,
    status: product?.status || 'DRAFT',
    isVisible: product?.isVisible ?? true,
    metaTitle: (product as any)?.metaTitle || '',
    metaDescription: (product as any)?.metaDescription || '',
  });
  const [noteInput, setNoteInput] = useState('');

  // Dynamic categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);

  // Fetch categories when modal opens
  useEffect(() => {
    const loadCategories = async () => {
      if (!selectedCompanyId) return;
      setCategoriesLoading(true);
      try {
        const cats = await categoriesApi.list(false, selectedCompanyId);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, [selectedCompanyId]);

  // Handle new category created
  const handleCategoryCreated = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory]);
    // Auto-select the new category
    if (!formData.categoryIds?.includes(newCategory.id)) {
      setFormData((prev) => ({ ...prev, categoryIds: [...(prev.categoryIds || []), newCategory.id] }));
    }
  };

  // AI state
  const [showAIModal, setShowAIModal] = useState(false);

  // Media state
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Load media when tab changes to media
  useEffect(() => {
    if (activeTab === 'media' && product?.id) {
      loadMedia();
    }
  }, [activeTab, product?.id]);

  const loadMedia = async () => {
    if (!product?.id) return;
    setMediaLoading(true);
    try {
      const mediaList = await mediaApi.list(product.id);
      setMedia(mediaList);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleMediaUpload = async (files: File[]) => {
    if (!product?.id) return;
    if (files.length === 1) {
      await mediaApi.upload(product.id, files[0]);
    } else {
      await mediaApi.uploadMultiple(product.id, files);
    }
    await loadMedia();
    onRefresh?.();
  };

  const handleMediaReorder = async (mediaIds: string[]) => {
    if (!product?.id) return;
    await mediaApi.reorder(product.id, mediaIds);
    await loadMedia();
  };

  const handleMediaSetPrimary = async (mediaId: string) => {
    if (!product?.id) return;
    await mediaApi.setAsPrimary(product.id, mediaId);
    await loadMedia();
    onRefresh?.();
  };

  const handleMediaDelete = async (mediaId: string) => {
    if (!product?.id) return;
    await mediaApi.delete(product.id, mediaId);
    await loadMedia();
    onRefresh?.();
  };

  const handleMediaUpdate = async (mediaId: string, data: { altText?: string; caption?: string }) => {
    if (!product?.id) return;
    await mediaApi.update(product.id, mediaId, data);
    await loadMedia();
  };

  const handleMediaProcess = async (mediaId: string, action: MediaProcessAction) => {
    if (!product?.id) return;
    await mediaApi.process(product.id, mediaId, { action });
    await loadMedia();
    onRefresh?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Exclude flavorNotes from payload - it's not a supported field yet
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { flavorNotes, ...payload } = formData;
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setLoading(false);
    }
  };

  const addNote = () => {
    if (noteInput.trim() && !formData.flavorNotes?.includes(noteInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        flavorNotes: [...(prev.flavorNotes || []), noteInput.trim()],
      }));
      setNoteInput('');
    }
  };

  const removeNote = (note: string) => {
    setFormData((prev) => ({
      ...prev,
      flavorNotes: prev.flavorNotes?.filter((n) => n !== note) || [],
    }));
  };

  // Handle AI generated description
  const handleAIApply = (result: GeneratedDescription) => {
    setFormData((prev) => ({
      ...prev,
      description: result.description,
      metaTitle: result.metaTitle || prev.metaTitle,
      metaDescription: result.metaDescription || prev.metaDescription,
    }));
  };

  // Handle AI category suggestions - find matching category by slug
  const handleApplyCategory = (categorySlug: string) => {
    const matchingCategory = categories.find((c) => c.slug === categorySlug || c.name.toLowerCase() === categorySlug.toLowerCase());
    if (matchingCategory && !formData.categoryIds?.includes(matchingCategory.id)) {
      setFormData((prev) => ({ ...prev, categoryIds: [...(prev.categoryIds || []), matchingCategory.id] }));
    }
  };

  // Handle AI tags (add to flavor notes for now)
  const handleApplyTags = (tags: string[]) => {
    setFormData((prev) => ({
      ...prev,
      flavorNotes: tags,
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl md:w-full z-50 overflow-hidden">
        <div className="h-full bg-popover border border-border rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {product ? 'Edit Product' : 'Add Product'}
            </h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs (only show for existing products) */}
          {product && (
            <div className="flex border-b border-border px-6">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'details'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                  activeTab === 'media'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                <ImageIcon className="w-4 h-4" />
                Media
                {media.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">
                    {media.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Details Tab / Form */}
          {(activeTab === 'details' || !product) && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="COFFEE-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Ethiopian Yirgacheffe"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-muted-foreground">Description</label>
                  <AIGenerateButton
                    productName={formData.name}
                    currentText={formData.description}
                    companyId={selectedCompanyId || undefined}
                    onOpenGenerateModal={() => setShowAIModal(true)}
                    onApplyText={(text) => setFormData((p) => ({ ...p, description: text }))}
                    size="sm"
                  />
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Describe your product..."
                />
                {formData.description && (
                  <GrammarCheckInline
                    text={formData.description}
                    onApplyCorrected={(text) => setFormData((p) => ({ ...p, description: text }))}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Categories & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Categories
                    {categoriesLoading && <span className="ml-2 text-xs text-muted-foreground">(Loading...)</span>}
                  </label>
                  {categories.length === 0 && !categoriesLoading ? (
                    <div className="text-sm text-muted-foreground py-2">
                      No categories found.{' '}
                      <button
                        type="button"
                        onClick={() => setShowQuickCategoryModal(true)}
                        className="text-primary hover:underline"
                      >
                        Create category
                      </button>{' '}
                      first.
                    </div>
                  ) : (
                    <>
                      <select
                        value=""
                        onChange={(e) => {
                          const categoryId = e.target.value;
                          if (categoryId && !formData.categoryIds?.includes(categoryId)) {
                            setFormData((p) => ({ ...p, categoryIds: [...(p.categoryIds || []), categoryId] }));
                          }
                        }}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">Add a category...</option>
                        {categories.filter((c) => !formData.categoryIds?.includes(c.id)).map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {formData.categoryIds && formData.categoryIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.categoryIds.map((catId) => {
                            const cat = categories.find((c) => c.id === catId);
                            return cat ? (
                              <span
                                key={catId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                              >
                                {cat.name}
                                <button
                                  type="button"
                                  onClick={() => setFormData((p) => ({
                                    ...p,
                                    categoryIds: p.categoryIds?.filter((id) => id !== catId) || [],
                                  }))}
                                  className="text-primary/70 hover:text-primary"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {PRODUCT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNote())}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Add note..."
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    className="px-3 py-2 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.flavorNotes && formData.flavorNotes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.flavorNotes.map((note) => (
                      <span
                        key={note}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs text-foreground"
                      >
                        {note}
                        <button
                          type="button"
                          onClick={() => removeNote(note)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              {formData.name && (
                <AISuggestions
                  productName={formData.name}
                  description={formData.description}
                  companyId={selectedCompanyId || undefined}
                  onApplyCategory={handleApplyCategory}
                  onApplyTags={handleApplyTags}
                  currentCategory={categories.find((c) => formData.categoryIds?.includes(c.id))?.slug || ''}
                  currentTags={formData.flavorNotes}
                />
              )}

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, costPrice: parseFloat(e.target.value) || undefined }))}
                      className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData((p) => ({ ...p, stockQuantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData((p) => ({ ...p, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isVisible: !p.isVisible }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50',
                    formData.isVisible ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      formData.isVisible ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm text-foreground">
                  {formData.isVisible ? 'Visible to customers' : 'Hidden from customers'}
                </span>
              </div>
            </div>
          </form>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && product && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Upload Section */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Upload Media</h3>
                <MediaUpload onUpload={handleMediaUpload} maxFiles={10} />
              </div>

              {/* Gallery Section */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Media Gallery
                  {media.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({media.length} {media.length === 1 ? 'item' : 'items'})
                    </span>
                  )}
                </h3>
                {mediaLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
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

          {/* Footer - show for details tab or new product */}
          {(activeTab === 'details' || !product) && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {product ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Description Modal */}
      <AIDescriptionModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        productName={formData.name}
        category={
          formData.categoryIds && formData.categoryIds.length > 0
            ? categories.find((c) => c.id === formData.categoryIds?.[0])?.slug
            : undefined
        }
        attributes={{
          flavorNotes: formData.flavorNotes,
        }}
        currentDescription={formData.description}
        onApply={handleAIApply}
        companyId={selectedCompanyId || undefined}
      />

      {/* Quick Category Modal */}
      {showQuickCategoryModal && selectedCompanyId && (
        <QuickCategoryModal
          onClose={() => setShowQuickCategoryModal(false)}
          onCreated={handleCategoryCreated}
          companyId={selectedCompanyId}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ProductsPage() {
  const router = useRouter();
  const { accessLevel, selectedCompanyId } = useHierarchy();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Dynamic categories for filter
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // Fetch categories for filter dropdown
  useEffect(() => {
    const loadCategories = async () => {
      if (!selectedCompanyId) {
        setFilterCategories([]);
        return;
      }
      try {
        const cats = await categoriesApi.list(false, selectedCompanyId);
        setFilterCategories(cats);
      } catch (err) {
        console.error('Failed to load categories for filter:', err);
      }
    };
    loadCategories();
  }, [selectedCompanyId]);

  const fetchProducts = useCallback(async () => {
    if (needsCompanySelection) {
      setProducts([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: ProductQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        companyId: selectedCompanyId || undefined,
      };

      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const result = await productsApi.list(params);
      setProducts(result.products);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter, selectedCompanyId, needsCompanySelection]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleSaveProduct = async (data: CreateProductInput | UpdateProductInput) => {
    if (editingProduct) {
      await productsApi.update(editingProduct.id, data, selectedCompanyId || undefined);
    } else {
      await productsApi.create(data as CreateProductInput);
    }
    fetchProducts();
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productsApi.delete(productToDelete.id, selectedCompanyId || undefined);
      toast.success(`Product "${productToDelete.name}" deleted`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} products` : 'Manage your product catalog'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={needsCompanySelection}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-card text-muted-foreground border border-border hover:text-foreground'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button
            onClick={fetchProducts}
            className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-card/50 border border-border rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Categories</option>
                {filterCategories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Statuses</option>
                {PRODUCT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {(categoryFilter || statusFilter) && (
              <button
                onClick={() => {
                  setCategoryFilter('');
                  setStatusFilter('');
                }}
                className="self-end px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Company Selection Required */}
      {needsCompanySelection && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Company</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Choose a company from the sidebar to view and manage products.
          </p>
        </div>
      )}

      {/* Loading State */}
      {!needsCompanySelection && loading && products.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!needsCompanySelection && !loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {search || categoryFilter || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first product.'}
          </p>
          {!search && !categoryFilter && !statusFilter && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {products.map((product) => {
            const isLowStock = product.trackInventory && product.stockQuantity <= product.lowStockThreshold;
            const statusConfig = STATUS_CONFIG[product.status] || { label: product.status, color: 'bg-muted text-muted-foreground' };

            return (
              <div
                key={product.id}
                className="bg-card/50 border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/products/${product.id}`)}
              >
                {/* Image Placeholder */}
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.images[0].alt || product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === product.id ? null : product.id);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenuId === product.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                            }}
                          />
                          <div className="absolute right-0 top-full mt-1 z-20 w-32 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/products/${product.id}`);
                                setOpenMenuId(null);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductToDelete(product);
                                setOpenMenuId(null);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                    {!product.isVisible && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(product.price, product.currency)}
                    </p>
                    {product.trackInventory && (
                      <div className={cn('flex items-center gap-1 text-xs', isLowStock ? 'text-yellow-400' : 'text-muted-foreground')}>
                        {isLowStock && <AlertTriangle className="w-3 h-3" />}
                        {product.stockQuantity} in stock
                      </div>
                    )}
                  </div>

                  {product.flavorNotes && product.flavorNotes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.flavorNotes.slice(0, 3).map((note) => (
                        <span key={note} className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                          {note}
                        </span>
                      ))}
                      {product.flavorNotes.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{product.flavorNotes.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={closeModal}
          onSave={handleSaveProduct}
          onRefresh={fetchProducts}
        />
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Product</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{productToDelete.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
