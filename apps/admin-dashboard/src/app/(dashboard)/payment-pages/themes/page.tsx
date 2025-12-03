'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Palette,
  Eye,
  Edit,
  Trash2,
  Copy,
  X,
  CheckCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  themesApi,
  CheckoutPageTheme,
  THEME_CATEGORIES,
  ThemeCategory,
} from '@/lib/api/payment-pages';

// ═══════════════════════════════════════════════════════════════
// THEME CARD
// ═══════════════════════════════════════════════════════════════

interface ThemeCardProps {
  theme: CheckoutPageTheme;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ThemeCard({ theme, onEdit, onDuplicate, onDelete }: ThemeCardProps) {
  const styles = theme.styles as Record<string, unknown>;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group">
      {/* Preview */}
      <div className="aspect-video relative overflow-hidden">
        {theme.thumbnail ? (
          <img src={theme.thumbnail} alt={theme.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${(styles?.primaryColor as string) || '#3B82F6'}30, ${(styles?.backgroundColor as string) || '#18181B'})`,
            }}
          >
            <div className="text-center">
              <Palette className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">{theme.name}</p>
            </div>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          {!theme.isSystem && (
            <button
              onClick={onDelete}
              className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* System Badge */}
        {theme.isSystem && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] text-cyan-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            System
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white">{theme.name}</h3>
          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
            {THEME_CATEGORIES[theme.category]?.label}
          </span>
        </div>

        {/* Color Preview */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full border border-zinc-700"
            style={{ backgroundColor: (styles?.primaryColor as string) || '#3B82F6' }}
            title="Primary Color"
          />
          <div
            className="w-6 h-6 rounded-full border border-zinc-700"
            style={{ backgroundColor: (styles?.backgroundColor as string) || '#18181B' }}
            title="Background Color"
          />
          <div
            className="w-6 h-6 rounded-full border border-zinc-700"
            style={{ backgroundColor: (styles?.accentColor as string) || '#22C55E' }}
            title="Accent Color"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// THEME EDITOR MODAL
// ═══════════════════════════════════════════════════════════════

interface ThemeEditorModalProps {
  theme?: CheckoutPageTheme | null;
  onClose: () => void;
  onSave: (data: Partial<CheckoutPageTheme>) => Promise<void>;
}

function ThemeEditorModal({ theme, onClose, onSave }: ThemeEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: theme?.name || '',
    category: theme?.category || ('MODERN' as ThemeCategory),
    styles: {
      primaryColor: (theme?.styles as any)?.primaryColor || '#3B82F6',
      backgroundColor: (theme?.styles as any)?.backgroundColor || '#18181B',
      accentColor: (theme?.styles as any)?.accentColor || '#22C55E',
      textColor: (theme?.styles as any)?.textColor || '#FFFFFF',
      borderRadius: (theme?.styles as any)?.borderRadius || '12px',
      fontFamily: (theme?.styles as any)?.fontFamily || 'Inter, system-ui, sans-serif',
      buttonStyle: (theme?.styles as any)?.buttonStyle || 'solid',
      inputStyle: (theme?.styles as any)?.inputStyle || 'outline',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        name: formData.name,
        category: formData.category,
        styles: formData.styles,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save theme:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl md:w-full z-50 overflow-hidden">
        <div className="h-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              {theme ? 'Edit Theme' : 'Create Theme'}
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Form Fields */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Theme Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="My Custom Theme"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value as ThemeCategory }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      {(Object.keys(THEME_CATEGORIES) as ThemeCategory[]).map((cat) => (
                        <option key={cat} value={cat}>{THEME_CATEGORIES[cat].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white">Colors</h3>
                  {[
                    { key: 'primaryColor', label: 'Primary Color' },
                    { key: 'backgroundColor', label: 'Background Color' },
                    { key: 'accentColor', label: 'Accent Color' },
                    { key: 'textColor', label: 'Text Color' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={(formData.styles as any)[key]}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            styles: { ...p.styles, [key]: e.target.value },
                          }))
                        }
                        className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                      />
                      <div className="flex-1">
                        <label className="block text-xs text-zinc-400">{label}</label>
                        <input
                          type="text"
                          value={(formData.styles as any)[key]}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              styles: { ...p.styles, [key]: e.target.value },
                            }))
                          }
                          className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Style Options */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white">Style Options</h3>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Border Radius</label>
                    <select
                      value={formData.styles.borderRadius}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          styles: { ...p.styles, borderRadius: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="0px">None (Square)</option>
                      <option value="4px">Small</option>
                      <option value="8px">Medium</option>
                      <option value="12px">Large</option>
                      <option value="16px">Extra Large</option>
                      <option value="9999px">Pill</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Button Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['solid', 'outline', 'ghost'].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              styles: { ...p.styles, buttonStyle: style },
                            }))
                          }
                          className={cn(
                            'px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
                            formData.styles.buttonStyle === style
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Preview</h3>
                <div
                  className="rounded-xl overflow-hidden border border-zinc-700"
                  style={{ backgroundColor: formData.styles.backgroundColor }}
                >
                  <div className="p-6 space-y-4">
                    <h4
                      className="text-lg font-semibold"
                      style={{ color: formData.styles.textColor }}
                    >
                      Complete Your Purchase
                    </h4>
                    <div
                      className="p-4 rounded-lg border"
                      style={{
                        borderRadius: formData.styles.borderRadius,
                        borderColor: `${formData.styles.primaryColor}30`,
                        backgroundColor: `${formData.styles.primaryColor}10`,
                      }}
                    >
                      <p className="text-sm" style={{ color: formData.styles.textColor }}>
                        Order Summary
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Email address"
                      className="w-full px-3 py-2 text-sm"
                      style={{
                        borderRadius: formData.styles.borderRadius,
                        backgroundColor:
                          formData.styles.inputStyle === 'filled'
                            ? `${formData.styles.textColor}10`
                            : 'transparent',
                        border: `1px solid ${formData.styles.textColor}30`,
                        color: formData.styles.textColor,
                      }}
                      readOnly
                    />
                    <button
                      type="button"
                      className="w-full px-4 py-2 font-medium text-sm transition-colors"
                      style={{
                        borderRadius: formData.styles.borderRadius,
                        backgroundColor:
                          formData.styles.buttonStyle === 'solid'
                            ? formData.styles.primaryColor
                            : 'transparent',
                        color:
                          formData.styles.buttonStyle === 'solid'
                            ? '#FFFFFF'
                            : formData.styles.primaryColor,
                        border:
                          formData.styles.buttonStyle !== 'ghost'
                            ? `2px solid ${formData.styles.primaryColor}`
                            : 'none',
                      }}
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
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
              {theme ? 'Save Changes' : 'Create Theme'}
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

export default function ThemesGalleryPage() {
  const { accessLevel, selectedCompanyId } = useHierarchy();
  const [themes, setThemes] = useState<CheckoutPageTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ThemeCategory | ''>('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CheckoutPageTheme | null>(null);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const fetchThemes = useCallback(async () => {
    if (needsCompanySelection) {
      setThemes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await themesApi.list(
        selectedCompanyId || undefined,
        categoryFilter || undefined,
        search || undefined
      );
      setThemes(result);
    } catch (err) {
      console.error('Failed to fetch themes:', err);
      setError('Failed to load themes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, selectedCompanyId, needsCompanySelection]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleSaveTheme = async (data: Partial<CheckoutPageTheme>) => {
    if (editingTheme) {
      await themesApi.update(editingTheme.id, data);
    } else {
      await themesApi.create(data, selectedCompanyId || undefined);
    }
    fetchThemes();
  };

  const handleDuplicate = async (theme: CheckoutPageTheme) => {
    try {
      await themesApi.create(
        {
          name: `${theme.name} (Copy)`,
          category: theme.category,
          styles: theme.styles,
        },
        selectedCompanyId || undefined
      );
      fetchThemes();
    } catch (err) {
      console.error('Failed to duplicate theme:', err);
    }
  };

  const handleDelete = async (theme: CheckoutPageTheme) => {
    if (!confirm(`Are you sure you want to delete "${theme.name}"?`)) return;
    try {
      await themesApi.delete(theme.id);
      fetchThemes();
    } catch (err) {
      console.error('Failed to delete theme:', err);
    }
  };

  const handleSeedThemes = async () => {
    try {
      const result = await themesApi.seedSystemThemes();
      alert(`Created ${result.created} system themes`);
      fetchThemes();
    } catch (err) {
      console.error('Failed to seed themes:', err);
    }
  };

  const openCreateModal = () => {
    setEditingTheme(null);
    setShowModal(true);
  };

  const openEditModal = (theme: CheckoutPageTheme) => {
    setEditingTheme(theme);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTheme(null);
  };

  // Filter themes
  const filteredThemes = themes.filter((theme) => {
    if (search && !theme.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Separate system and custom themes
  const systemThemes = filteredThemes.filter((t) => t.isSystem);
  const customThemes = filteredThemes.filter((t) => !t.isSystem);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Theme Gallery</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Browse and customize checkout page themes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedThemes}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Seed System Themes
          </button>
          <button
            onClick={openCreateModal}
            disabled={needsCompanySelection}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Theme
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search themes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <button
            onClick={fetchThemes}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              !categoryFilter
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
            )}
          >
            All
          </button>
          {(Object.keys(THEME_CATEGORIES) as ThemeCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                categoryFilter === category
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
              )}
            >
              {THEME_CATEGORIES[category].label}
            </button>
          ))}
        </div>
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
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Select a Company</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Choose a company from the sidebar to view and manage themes.
          </p>
        </div>
      )}

      {/* Loading State */}
      {!needsCompanySelection && loading && themes.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!needsCompanySelection && !loading && themes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Palette className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No themes found</h3>
          <p className="text-sm text-zinc-500 max-w-md mb-4">
            Get started by creating a custom theme or seeding the system themes.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSeedThemes}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Seed System Themes
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Theme
            </button>
          </div>
        </div>
      )}

      {/* Theme Sections */}
      {!needsCompanySelection && !loading && themes.length > 0 && (
        <div className="space-y-8">
          {/* System Themes */}
          {systemThemes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                System Themes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {systemThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    onEdit={() => openEditModal(theme)}
                    onDuplicate={() => handleDuplicate(theme)}
                    onDelete={() => handleDelete(theme)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Themes */}
          {customThemes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Custom Themes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    onEdit={() => openEditModal(theme)}
                    onDuplicate={() => handleDuplicate(theme)}
                    onDelete={() => handleDelete(theme)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Theme Editor Modal */}
      {showModal && (
        <ThemeEditorModal
          theme={editingTheme}
          onClose={closeModal}
          onSave={handleSaveTheme}
        />
      )}
    </div>
  );
}
