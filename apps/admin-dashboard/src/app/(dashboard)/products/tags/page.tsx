'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Tag,
  Tags,
  Edit,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  tagsApi,
  Tag as TagType,
  CreateTagInput,
  UpdateTagInput,
} from '@/lib/api/products';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const TAG_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];

// ═══════════════════════════════════════════════════════════════
// TAG MODAL
// ═══════════════════════════════════════════════════════════════

interface TagModalProps {
  tag?: TagType | null;
  onClose: () => void;
  onSave: (data: CreateTagInput | UpdateTagInput) => Promise<void>;
}

function TagModal({ tag, onClose, onSave }: TagModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTagInput>({
    name: tag?.name || '',
    slug: tag?.slug || '',
    color: tag?.color || TAG_COLORS[0].value,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save tag:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full z-50">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              {tag ? 'Edit Tag' : 'Add Tag'}
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="Tag name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="tag-slug (auto-generated if empty)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, color: color.value }))}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        formData.color === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                          : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Preview</label>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: `${formData.color}20`, color: formData.color }}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {formData.name || 'Tag Name'}
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
              {tag ? 'Save Changes' : 'Create Tag'}
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
  tag: TagType;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteModal({ tag, onClose, onConfirm }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to delete tag:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full z-50">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Delete Tag</h2>
              <p className="text-sm text-zinc-500">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 mb-6">
            Are you sure you want to delete <strong>{tag.name}</strong>?
            {tag.productCount > 0 && (
              <span className="block mt-2 text-yellow-400">
                Warning: This tag is used by {tag.productCount} products.
              </span>
            )}
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
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

export default function TagsPage() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagType | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await tagsApi.list();
      setTags(data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setError('Failed to load tags. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase()) ||
    tag.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveTag = async (data: CreateTagInput | UpdateTagInput) => {
    if (editingTag) {
      await tagsApi.update(editingTag.id, data);
    } else {
      await tagsApi.create(data as CreateTagInput);
    }
    fetchTags();
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;
    await tagsApi.delete(deletingTag.id);
    fetchTags();
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setShowModal(true);
  };

  const openEditModal = (tag: TagType) => {
    setEditingTag(tag);
    setShowModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Tags</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Label your products for easy filtering
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTags}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Tag
          </button>
        </div>
      </div>

      {/* Search */}
      {tags.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
      {loading && tags.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tags className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tags yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mb-4">
            Create tags to organize and filter your products.
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Tag
          </button>
        </div>
      )}

      {/* Tags Grid */}
      {filteredTags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${tag.color || '#6b7280'}20`,
                    color: tag.color || '#6b7280'
                  }}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {tag.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(tag)}
                    className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTag(tag)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                <p>Slug: {tag.slug}</p>
                <p className="mt-1">{tag.productCount} products</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && tags.length > 0 && filteredTags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No matching tags</h3>
          <p className="text-sm text-zinc-500">
            Try adjusting your search term.
          </p>
        </div>
      )}

      {/* Tag Modal */}
      {showModal && (
        <TagModal
          tag={editingTag}
          onClose={() => {
            setShowModal(false);
            setEditingTag(null);
          }}
          onSave={handleSaveTag}
        />
      )}

      {/* Delete Modal */}
      {deletingTag && (
        <DeleteModal
          tag={deletingTag}
          onClose={() => setDeletingTag(null)}
          onConfirm={handleDeleteTag}
        />
      )}
    </div>
  );
}
