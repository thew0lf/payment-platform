'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Star,
  Check,
  Filter,
  LayoutGrid,
  Eye,
  Crown,
  TrendingUp,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  getTemplateGallery,
  createFromTemplate,
  TemplateGalleryItem,
  TemplateCategory,
  LandingPageTheme,
} from '@/lib/api/landing-pages';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const THEME_COLORS: Record<string, string> = {
  STARTER: 'bg-blue-500',
  ARTISAN: 'bg-amber-500',
  VELOCITY: 'bg-red-500',
  LUXE: 'bg-purple-500',
  WELLNESS: 'bg-emerald-500',
  FOODIE: 'bg-orange-500',
  PROFESSIONAL: 'bg-sky-500',
  CREATOR: 'bg-pink-500',
  MARKETPLACE: 'bg-cyan-500',
};

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most Popular' },
  { value: 'name', label: 'Name' },
  { value: 'newest', label: 'Newest' },
] as const;

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CARD
// ═══════════════════════════════════════════════════════════════

interface TemplateCardProps {
  template: TemplateGalleryItem;
  onSelect: () => void;
  onPreview?: () => void;
}

function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  const themeColor = THEME_COLORS[template.theme] || 'bg-zinc-500';

  return (
    <div className="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 hover:shadow-xl hover:shadow-zinc-900/50 transition-all duration-300">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        {template.isNew && (
          <span className="px-2 py-0.5 bg-emerald-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            New
          </span>
        )}
        {template.isPremium && (
          <span className="px-2 py-0.5 bg-amber-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Premium
          </span>
        )}
      </div>

      {/* Popularity indicator */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900/80 rounded-full text-xs text-zinc-400">
          <TrendingUp className="h-3 w-3" />
          {template.popularity}%
        </div>
      </div>

      {/* Preview Area */}
      <div className="aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden">
        {/* Placeholder gradient based on theme */}
        <div className={cn('absolute inset-0 opacity-20', themeColor)} />
        <div className="relative z-10 text-center p-6">
          <LayoutGrid className="h-12 w-12 text-zinc-500 mx-auto mb-2" />
          <span className="text-sm text-zinc-400">{template.sectionCount} sections</span>
        </div>

        {/* Overlay on hover - z-20 to be above badges (z-10) */}
        <div className="absolute inset-0 z-20 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-300">
          <button
            onClick={onSelect}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Use Template
          </button>
          {onPreview && (
            <button
              onClick={onPreview}
              className="p-2.5 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-white">{template.name}</h3>
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium text-white', themeColor)}>
            {template.theme.charAt(0) + template.theme.slice(1).toLowerCase()}
          </span>
        </div>

        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{template.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-0.5 text-zinc-500 text-xs">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Features */}
        <div className="text-xs text-zinc-500">
          {template.features.slice(0, 2).join(' • ')}
          {template.features.length > 2 && ` • +${template.features.length - 2} more`}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USE TEMPLATE MODAL
// ═══════════════════════════════════════════════════════════════

interface UseTemplateModalProps {
  template: TemplateGalleryItem;
  onClose: () => void;
  onCreated: () => void;
}

function UseTemplateModal({ template, onClose, onCreated }: UseTemplateModalProps) {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return;

    // Check if org/client-level user has selected a company
    if ((accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId) {
      toast.error('Please select a company before creating a landing page');
      return;
    }

    setLoading(true);
    try {
      const page = await createFromTemplate({
        templateId: template.id,
        name: formData.name,
        slug: formData.slug,
        theme: template.theme,
        companyId: selectedCompanyId || undefined,
      });
      toast.success('Landing page created successfully');
      onCreated();
      router.push(`/landing-pages/${page.id}/edit`);
    } catch (err: any) {
      console.error('Failed to create page:', err);
      toast.error(err.message || 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Create from Template</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Using: {template.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Page Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Landing Page"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              required
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">URL Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="my-landing-page"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Template Info */}
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', THEME_COLORS[template.theme] + '/20')}>
                <LayoutGrid className={cn('h-6 w-6', THEME_COLORS[template.theme]?.replace('bg-', 'text-'))} />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{template.name}</div>
                <div className="text-xs text-zinc-400">{template.sectionCount} sections • {template.theme}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.slug}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Page
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function TemplateGalleryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateGalleryItem[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'newest'>('popularity');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateGalleryItem | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplateGallery({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: search || undefined,
        sortBy,
      });
      setTemplates(data.templates);
      setCategories(data.categories);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search, sortBy]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search) {
        loadTemplates();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/landing-pages')}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-400" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
                  Template Gallery
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Choose a professionally designed template to get started
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
              <ChevronDown className={cn('h-4 w-4 transition-transform', showSortDropdown && 'rotate-180')} />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors',
                        sortBy === option.value
                          ? 'text-white bg-zinc-700'
                          : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-6">
        {loading && templates.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutGrid className="h-16 w-16 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
            <p className="text-zinc-400 mb-6 max-w-md">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => setSelectedTemplate(template)}
                onPreview={template.previewUrl ? () => window.open(template.previewUrl, '_blank') : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Use Template Modal */}
      {selectedTemplate && (
        <UseTemplateModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onCreated={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
