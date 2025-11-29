'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  productsApi,
  Product,
  ProductQueryParams,
  CreateProductInput,
  UpdateProductInput,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  ROAST_LEVELS,
} from '@/lib/api/products';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400' },
  DRAFT: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-400' },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-400' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-500/10 text-red-400' },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// PRODUCT MODAL
// ═══════════════════════════════════════════════════════════════

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (data: CreateProductInput | UpdateProductInput) => Promise<void>;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductInput>({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'COFFEE',
    roastLevel: product?.roastLevel || '',
    origin: product?.origin || '',
    flavorNotes: product?.flavorNotes || [],
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stockQuantity: product?.stockQuantity || 0,
    lowStockThreshold: product?.lowStockThreshold || 10,
    status: product?.status || 'DRAFT',
    isVisible: product?.isVisible ?? true,
  });
  const [flavorInput, setFlavorInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setLoading(false);
    }
  };

  const addFlavorNote = () => {
    if (flavorInput.trim() && !formData.flavorNotes?.includes(flavorInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        flavorNotes: [...(prev.flavorNotes || []), flavorInput.trim()],
      }));
      setFlavorInput('');
    }
  };

  const removeFlavorNote = (note: string) => {
    setFormData((prev) => ({
      ...prev,
      flavorNotes: prev.flavorNotes?.filter((n) => n !== note) || [],
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:w-full z-50 overflow-hidden">
        <div className="h-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              {product ? 'Edit Product' : 'Add Product'}
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="COFFEE-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Ethiopian Yirgacheffe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  placeholder="Describe your product..."
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
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
                    onChange={(e) => setFormData((p) => ({ ...p, roastLevel: e.target.value }))}
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
                    value={formData.status}
                    onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {PRODUCT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Origin */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Origin</label>
                <input
                  type="text"
                  value={formData.origin || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, origin: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Ethiopia, Yirgacheffe Region"
                />
              </div>

              {/* Flavor Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Flavor Notes</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={flavorInput}
                    onChange={(e) => setFlavorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFlavorNote())}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Add flavor note..."
                  />
                  <button
                    type="button"
                    onClick={addFlavorNote}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    Add
                  </button>
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
                          type="button"
                          onClick={() => removeFlavorNote(note)}
                          className="text-zinc-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, costPrice: parseFloat(e.target.value) || undefined }))}
                      className="w-full pl-7 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData((p) => ({ ...p, stockQuantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData((p) => ({ ...p, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isVisible: !p.isVisible }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
                    formData.isVisible ? 'bg-cyan-500' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      formData.isVisible ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm text-zinc-300">
                  {formData.isVisible ? 'Visible to customers' : 'Hidden from customers'}
                </span>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {product ? 'Save Changes' : 'Create Product'}
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

export default function ProductsPage() {
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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ProductQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
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
  }, [page, search, categoryFilter, statusFilter]);

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
      await productsApi.update(editingProduct.id, data);
    } else {
      await productsApi.create(data as CreateProductInput);
    }
    fetchProducts();
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
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total > 0 ? `${total} products` : 'Manage your product catalog'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button
            onClick={fetchProducts}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Categories</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                className="self-end px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
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

      {/* Loading State */}
      {loading && products.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
          <p className="text-sm text-zinc-500 max-w-md mb-4">
            {search || categoryFilter || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first product.'}
          </p>
          {!search && !categoryFilter && !statusFilter && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
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
            const statusConfig = STATUS_CONFIG[product.status] || { label: product.status, color: 'bg-zinc-500/10 text-zinc-400' };

            return (
              <div
                key={product.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Image Placeholder */}
                <div className="aspect-square bg-zinc-800 flex items-center justify-center">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-zinc-600" />
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{product.name}</h3>
                      <p className="text-xs text-zinc-500">{product.sku}</p>
                    </div>
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                    {!product.isVisible && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(product.price, product.currency)}
                    </p>
                    {product.trackInventory && (
                      <div className={cn('flex items-center gap-1 text-xs', isLowStock ? 'text-yellow-400' : 'text-zinc-500')}>
                        {isLowStock && <AlertTriangle className="w-3 h-3" />}
                        {product.stockQuantity} in stock
                      </div>
                    )}
                  </div>

                  {product.flavorNotes && product.flavorNotes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.flavorNotes.slice(0, 3).map((note) => (
                        <span key={note} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400">
                          {note}
                        </span>
                      ))}
                      {product.flavorNotes.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-zinc-500">
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
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
        />
      )}
    </div>
  );
}
