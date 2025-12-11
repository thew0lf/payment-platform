'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Layers,
  Edit,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowLeft,
  Search,
  Sparkles,
  FileStack,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  collectionsApi,
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionRules,
  CollectionCondition,
  COLLECTION_TYPES,
} from '@/lib/api/products';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CONDITION_FIELDS = [
  { value: 'category', label: 'Category' },
  { value: 'tag', label: 'Tag' },
  { value: 'price', label: 'Price' },
  { value: 'title', label: 'Title' },
  { value: 'sku', label: 'SKU' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

// ═══════════════════════════════════════════════════════════════
// COLLECTION MODAL
// ═══════════════════════════════════════════════════════════════

interface CollectionModalProps {
  collection?: Collection | null;
  onClose: () => void;
  onSave: (data: CreateCollectionInput | UpdateCollectionInput) => Promise<void>;
}

function CollectionModal({ collection, onClose, onSave }: CollectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCollectionInput>({
    name: collection?.name || '',
    slug: collection?.slug || '',
    description: collection?.description || '',
    type: collection?.type || 'MANUAL',
    rules: collection?.rules || undefined,
    sortOrder: collection?.sortOrder || 0,
    isActive: collection?.isActive ?? true,
  });

  const [conditions, setConditions] = useState<CollectionCondition[]>(
    collection?.rules?.conditions || []
  );
  const [matchType, setMatchType] = useState<'ALL' | 'ANY'>(
    collection?.rules?.matchType || 'ALL'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave: CreateCollectionInput = {
        ...formData,
        rules: formData.type === 'AUTOMATIC' && conditions.length > 0
          ? { conditions, matchType }
          : undefined,
      };
      await onSave(dataToSave);
      onClose();
    } catch (err) {
      console.error('Failed to save collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'category', operator: 'equals', value: '' },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<CollectionCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:w-full z-50 overflow-hidden">
        <div className="h-full bg-card border border-border rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {collection ? 'Edit Collection' : 'Add Collection'}
            </h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Collection name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="collection-slug (auto-generated)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Optional description..."
                />
              </div>

              {/* Collection Type */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Collection Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, type: 'MANUAL' }))}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border transition-colors',
                      formData.type === 'MANUAL'
                        ? 'bg-primary/10 border-primary/50 text-foreground'
                        : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <FileStack className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-medium">Manual</p>
                      <p className="text-xs opacity-70">Add products manually</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, type: 'AUTOMATIC' }))}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border transition-colors',
                      formData.type === 'AUTOMATIC'
                        ? 'bg-primary/10 border-primary/50 text-foreground'
                        : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sparkles className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-medium">Automatic</p>
                      <p className="text-xs opacity-70">Use rules to populate</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Automatic Collection Rules */}
              {formData.type === 'AUTOMATIC' && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Rules</h3>
                    <select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value as 'ALL' | 'ANY')}
                      className="px-2 py-1 bg-muted border border-border rounded text-sm text-foreground focus:outline-none"
                    >
                      <option value="ALL">Match ALL conditions</option>
                      <option value="ANY">Match ANY condition</option>
                    </select>
                  </div>

                  {conditions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No conditions added yet.</p>
                  )}

                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(index, { field: e.target.value as any })}
                        className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none"
                      >
                        {CONDITION_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                        className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none"
                      >
                        {CONDITION_OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <input
                        type={condition.field === 'price' ? 'number' : 'text'}
                        value={condition.value}
                        onChange={(e) => updateCondition(index, {
                          value: condition.field === 'price' ? parseFloat(e.target.value) || 0 : e.target.value
                        })}
                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none"
                        placeholder="Value"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCondition}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </button>
                </div>
              )}

              {/* Sort Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
                    className={cn(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50',
                      formData.isActive ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        formData.isActive ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                  <span className="text-sm text-foreground">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
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
              {collection ? 'Save Changes' : 'Create Collection'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

interface DeleteModalProps {
  collection: Collection;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteModal({ collection, onClose, onConfirm }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full z-50">
        <div className="bg-card border border-border rounded-xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Delete Collection</h2>
              <p className="text-sm text-muted-foreground">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-sm text-foreground mb-6">
            Are you sure you want to delete <strong>{collection.name}</strong>?
            {collection.productCount > 0 && (
              <span className="block mt-2 text-muted-foreground">
                This collection has {collection.productCount} products (they won&apos;t be deleted).
              </span>
            )}
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-foreground rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CollectionsPage() {
  const { accessLevel, selectedCompanyId, selectedCompany } = useHierarchy();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const fetchCollections = useCallback(async () => {
    if (needsCompanySelection) {
      setCollections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await collectionsApi.list(true, selectedCompanyId || undefined);
      setCollections(data);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
      setError('Failed to load collections. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, needsCompanySelection]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveCollection = async (data: CreateCollectionInput | UpdateCollectionInput) => {
    if (editingCollection) {
      await collectionsApi.update(editingCollection.id, data);
    } else {
      await collectionsApi.create(data as CreateCollectionInput);
    }
    fetchCollections();
  };

  const handleDeleteCollection = async () => {
    if (!deletingCollection) return;
    await collectionsApi.delete(deletingCollection.id);
    fetchCollections();
  };

  const handleRefreshCollection = async (collection: Collection) => {
    if (collection.type !== 'AUTOMATIC') return;
    try {
      await collectionsApi.refresh(collection.id);
      fetchCollections();
    } catch (err) {
      console.error('Failed to refresh collection:', err);
    }
  };

  const openCreateModal = () => {
    setEditingCollection(null);
    setShowModal(true);
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setShowModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collections</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Group products into curated collections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCollections}
            className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openCreateModal}
            disabled={needsCompanySelection}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={needsCompanySelection ? 'Select a company first' : undefined}
          >
            <Plus className="w-4 h-4" />
            Add Collection
          </button>
        </div>
      </div>

      {/* Search */}
      {collections.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && collections.length === 0 && !needsCompanySelection && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
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
            Choose a company from the sidebar to view and manage collections.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !needsCompanySelection && collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No collections yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Create collections to group and showcase your products.
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Collection
          </button>
        </div>
      )}

      {/* Collections Grid */}
      {filteredCollections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((collection) => (
            <div
              key={collection.id}
              className="group bg-card/50 border border-border rounded-xl overflow-hidden hover:border-border transition-colors"
            >
              {/* Image/Banner */}
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {collection.imageUrl ? (
                  <img
                    src={collection.imageUrl}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Layers className="w-10 h-10 text-muted-foreground" />
                )}
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      collection.type === 'AUTOMATIC'
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {collection.type === 'AUTOMATIC' ? (
                      <Sparkles className="w-3 h-3" />
                    ) : (
                      <FileStack className="w-3 h-3" />
                    )}
                    {collection.type === 'AUTOMATIC' ? 'Auto' : 'Manual'}
                  </span>
                </div>
                {/* Status */}
                {!collection.isActive && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                      <EyeOff className="w-3 h-3" />
                      Inactive
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{collection.name}</h3>
                    <p className="text-xs text-muted-foreground">{collection.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {collection.type === 'AUTOMATIC' && (
                      <button
                        onClick={() => handleRefreshCollection(collection)}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        title="Refresh products"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(collection)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCollection(collection)}
                      className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {collection.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {collection.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{collection.productCount} products</span>
                  {collection.rules && (
                    <span>
                      {collection.rules.conditions.length} rule{collection.rules.conditions.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && collections.length > 0 && filteredCollections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No matching collections</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search term.
          </p>
        </div>
      )}

      {/* Collection Modal */}
      {showModal && (
        <CollectionModal
          collection={editingCollection}
          onClose={() => {
            setShowModal(false);
            setEditingCollection(null);
          }}
          onSave={handleSaveCollection}
        />
      )}

      {/* Delete Modal */}
      {deletingCollection && (
        <DeleteModal
          collection={deletingCollection}
          onClose={() => setDeletingCollection(null)}
          onConfirm={handleDeleteCollection}
        />
      )}
    </div>
  );
}
