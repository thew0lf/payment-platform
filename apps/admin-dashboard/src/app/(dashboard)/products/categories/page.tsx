'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  FolderTree,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  categoriesApi,
  Category,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/lib/api/products';

// ═══════════════════════════════════════════════════════════════
// CATEGORY MODAL
// ═══════════════════════════════════════════════════════════════

interface CategoryModalProps {
  category?: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
}

function CategoryModal({ category, categories, onClose, onSave }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: category?.name || '',
    slug: category?.slug || '',
    parentId: category?.parentId || undefined,
    description: category?.description || '',
    sortOrder: category?.sortOrder || 0,
    isActive: category?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter out the current category and its children from parent options
  const availableParents = categories.filter((c) => {
    if (!category) return true;
    if (c.id === category.id) return false;
    // Prevent circular references by checking path
    if (c.path?.startsWith(category.path || '')) return false;
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:w-full z-50">
        <div className="h-full bg-card border border-border rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {category ? 'Edit Category' : 'Add Category'}
            </h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="category-slug (auto-generated if empty)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Parent Category</label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, parentId: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">None (Top Level)</option>
                  {availableParents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {'—'.repeat(c.level)} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Optional description..."
                />
              </div>

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

              <div className="flex items-center gap-3">
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
              {category ? 'Save Changes' : 'Create Category'}
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
  category: Category;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteModal({ category, onClose, onConfirm }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to delete category:', err);
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
              <h2 className="text-lg font-semibold text-foreground">Delete Category</h2>
              <p className="text-sm text-muted-foreground">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-sm text-foreground mb-6">
            Are you sure you want to delete <strong>{category.name}</strong>?
            {category.productCount > 0 && (
              <span className="block mt-2 text-yellow-400">
                Warning: This category has {category.productCount} products assigned.
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
// TREE ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════

interface TreeItemProps {
  node: CategoryTreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (category: CategoryTreeNode) => void;
  onDelete: (category: CategoryTreeNode) => void;
}

function TreeItem({ node, expandedIds, onToggle, onEdit, onDelete }: TreeItemProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div className="group flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors">
        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => onToggle(node.id)}
          className={cn(
            'p-1 rounded transition-colors',
            hasChildren ? 'hover:bg-muted text-muted-foreground' : 'text-transparent cursor-default'
          )}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Folder Icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-primary" />
        ) : (
          <Folder className="w-4 h-4 text-muted-foreground" />
        )}

        {/* Name */}
        <span className="flex-1 text-sm text-foreground">{node.name}</span>

        {/* Product Count */}
        {node.productCount > 0 && (
          <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
            {node.productCount}
          </span>
        )}

        {/* Status */}
        {!node.isActive && (
          <span className="px-2 py-0.5 bg-yellow-500/10 rounded text-xs text-yellow-400">
            Inactive
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(node)}
            className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-6 border-l border-border pl-2">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CategoriesPage() {
  const { accessLevel, selectedCompanyId } = useHierarchy();
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const fetchCategories = useCallback(async () => {
    if (needsCompanySelection) {
      setTree([]);
      setFlatCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [treeData, listData] = await Promise.all([
        categoriesApi.getTree(selectedCompanyId || undefined),
        categoriesApi.list(true, selectedCompanyId || undefined),
      ]);
      setTree(treeData);
      setFlatCategories(listData);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, needsCompanySelection]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children) collectIds(node.children);
      });
    };
    collectIds(tree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleSaveCategory = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    if (editingCategory) {
      await categoriesApi.update(editingCategory.id, data);
    } else {
      await categoriesApi.create(data as CreateCategoryInput);
    }
    fetchCategories();
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await categoriesApi.delete(deletingCategory.id);
    fetchCategories();
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const openEditModal = (category: CategoryTreeNode) => {
    // Find full category data from flat list
    const fullCategory = flatCategories.find((c) => c.id === category.id);
    setEditingCategory(fullCategory || (category as unknown as Category));
    setShowModal(true);
  };

  const openDeleteModal = (category: CategoryTreeNode) => {
    const fullCategory = flatCategories.find((c) => c.id === category.id);
    setDeletingCategory(fullCategory || (category as unknown as Category));
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
            <h1 className="text-2xl font-bold text-foreground">Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your products with hierarchical categories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
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
            Add Category
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && tree.length === 0 && !needsCompanySelection && (
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
            Choose a company from the sidebar to view and manage categories.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !needsCompanySelection && tree.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderTree className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No categories yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Create categories to organize your products hierarchically.
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      )}

      {/* Category Tree */}
      {tree.length > 0 && (
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{flatCategories.length} categories</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Tree */}
          <div className="p-4">
            {tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <CategoryModal
          category={editingCategory}
          categories={flatCategories}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
        />
      )}

      {/* Delete Modal */}
      {deletingCategory && (
        <DeleteModal
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onConfirm={handleDeleteCategory}
        />
      )}
    </div>
  );
}
