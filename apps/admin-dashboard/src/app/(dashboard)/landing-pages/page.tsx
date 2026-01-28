'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus,
  FileText,
  RefreshCw,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  ExternalLink,
  Globe,
  Palette,
  LayoutTemplate,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLandingPages,
  deleteLandingPage,
  duplicateLandingPage,
  createFromTemplate,
  getTemplates,
  LandingPageSummary,
  LandingPageTheme,
  TemplateOption,
} from '@/lib/api/landing-pages';
import { useHierarchy } from '@/contexts/hierarchy-context';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border' },
  PUBLISHED: { label: 'Published', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
};

const THEME_CONFIG: Record<LandingPageTheme, { label: string; color: string }> = {
  STARTER: { label: 'Starter', color: 'bg-blue-500/10 text-blue-400' },
  ARTISAN: { label: 'Artisan', color: 'bg-amber-500/10 text-amber-400' },
  VELOCITY: { label: 'Velocity', color: 'bg-red-500/10 text-red-400' },
  LUXE: { label: 'Luxe', color: 'bg-purple-500/10 text-purple-400' },
  WELLNESS: { label: 'Wellness', color: 'bg-emerald-500/10 text-emerald-400' },
  FOODIE: { label: 'Foodie', color: 'bg-orange-500/10 text-orange-400' },
  PROFESSIONAL: { label: 'Professional', color: 'bg-sky-500/10 text-sky-400' },
  CREATOR: { label: 'Creator', color: 'bg-pink-500/10 text-pink-400' },
  MARKETPLACE: { label: 'Marketplace', color: 'bg-primary/10 text-primary' },
};

// ═══════════════════════════════════════════════════════════════
// CREATE PAGE MODAL
// ═══════════════════════════════════════════════════════════════

interface CreatePageModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreatePageModal({ onClose, onCreated }: CreatePageModalProps) {
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [selectedTheme, setSelectedTheme] = useState<LandingPageTheme>('STARTER');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

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

    setLoading(true);
    try {
      const page = await createFromTemplate({
        templateId: selectedTemplate,
        name: formData.name,
        slug: formData.slug,
        theme: selectedTheme,
        companyId: selectedCompanyId || undefined,
      });
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
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Create Landing Page</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name & Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Page Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Landing Page"
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">URL Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="my-landing-page"
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Templates */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              <LayoutTemplate className="inline h-4 w-4 mr-1" />
              Choose Template
            </label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all',
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border bg-muted/50 hover:border-border'
                  )}
                >
                  <div className="font-medium text-foreground mb-1">{template.name}</div>
                  <div className="text-sm text-muted-foreground">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              <Palette className="inline h-4 w-4 mr-1" />
              Choose Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(THEME_CONFIG) as [LandingPageTheme, { label: string; color: string }][]).map(
                ([theme, config]) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                      selectedTheme === theme
                        ? 'border-blue-500 bg-blue-500/10 text-foreground'
                        : 'border-border bg-muted/50 text-muted-foreground hover:border-border'
                    )}
                  >
                    {config.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.slug}
              className="px-4 py-2 rounded-lg bg-blue-600 text-foreground font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

interface DeleteModalProps {
  page: LandingPageSummary;
  onClose: () => void;
  onConfirm: (permanent: boolean) => void;
  deleting: boolean;
}

function DeleteModal({ page, onClose, onConfirm, deleting }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">Delete Landing Page</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete <span className="text-foreground font-medium">"{page.name}"</span>?
              </p>

              {page.status === 'PUBLISHED' && (
                <div className="p-3 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-400">
                    This page is currently published. Deleting it will remove it from the web.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => onConfirm(false)}
                  disabled={deleting}
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 text-left"
                >
                  <div className="font-medium">Move to trash</div>
                  <div className="text-xs text-muted-foreground">Can be restored from deleted items</div>
                </button>
                <button
                  onClick={() => onConfirm(true)}
                  disabled={deleting}
                  className="w-full px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="font-medium">Delete permanently</div>
                  <div className="text-xs text-red-400/70">This cannot be undone</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE CARD
// ═══════════════════════════════════════════════════════════════

interface PageCardProps {
  page: LandingPageSummary;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function PageCard({ page, onEdit, onDuplicate, onDelete }: PageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[page.status] || STATUS_CONFIG.DRAFT;
  const themeConfig = THEME_CONFIG[page.theme] || THEME_CONFIG.STARTER;

  const getUrl = () => {
    if (page.platformUrl) return page.platformUrl;
    if (page.clientUrl) return page.clientUrl;
    if (page.subdomain) return `https://${page.subdomain}`;
    return null;
  };

  const url = getUrl();

  return (
    <div className="group relative bg-card/50 border border-border rounded-xl hover:border-border transition-all">
      {/* Preview Area */}
      <div className="aspect-video bg-muted/50 flex items-center justify-center relative rounded-t-xl overflow-hidden">
        <FileText className="h-12 w-12 text-muted-foreground" />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-foreground text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Page
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-foreground truncate">{page.name}</h3>
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
              title="More options"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-muted border border-border rounded-lg shadow-2xl z-50 py-1 overflow-visible">
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { onDuplicate(); setMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-muted flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', statusConfig.color)}>
            {statusConfig.label}
          </span>
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', themeConfig.color)}>
            {themeConfig.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{page.sectionCount} sections</span>
          {url && (
            <span className="flex items-center gap-1 text-blue-400">
              <Globe className="h-3.5 w-3.5" />
              Live
            </span>
          )}
        </div>

        {page.subdomain && (
          <div className="mt-2 text-xs text-muted-foreground truncate">
            {page.subdomain}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function LandingPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<LandingPageSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageToDuplicate, setPageToDuplicate] = useState<LandingPageSummary | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLandingPages();
      setPages(data);
    } catch (err) {
      console.error('Failed to load landing pages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleDuplicate = (page: LandingPageSummary) => {
    setPageToDuplicate(page);
    setDuplicateName(`${page.name} (Copy)`);
  };

  const confirmDuplicate = async () => {
    if (!pageToDuplicate || !duplicateName.trim()) return;

    setDuplicating(true);
    try {
      await duplicateLandingPage(pageToDuplicate.id, duplicateName.trim());
      toast.success('Page duplicated successfully');
      setPageToDuplicate(null);
      setDuplicateName('');
      loadPages();
    } catch (err: any) {
      console.error('Failed to duplicate:', err);
      toast.error(err.message || 'Failed to duplicate page');
    } finally {
      setDuplicating(false);
    }
  };

  const handleDeleteConfirm = async (permanent: boolean) => {
    if (!pageToDelete) return;

    setDeleting(true);
    try {
      await deleteLandingPage(pageToDelete.id, permanent);
      toast.success(
        permanent
          ? 'Page permanently deleted'
          : 'Page moved to trash',
        {
          description: permanent
            ? undefined
            : 'You can restore it from the deleted items page',
        }
      );
      setPageToDelete(null);
      loadPages();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      toast.error(err.message || 'Failed to delete page');
    } finally {
      setDeleting(false);
    }
  };

  // Filter pages
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      !search ||
      page.name.toLowerCase().includes(search.toLowerCase()) ||
      page.slug.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Landing Pages</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage landing pages for your campaigns
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/landing-pages/templates')}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
              >
                <LayoutTemplate className="h-4 w-4" />
                Browse Templates
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-foreground font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-4 border-b border-border bg-card/30">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Refresh */}
          <button
            onClick={loadPages}
            disabled={loading}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-6">
        {loading && pages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No landing pages yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first landing page to start promoting your products and campaigns.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-foreground font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Your First Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                onEdit={() => router.push(`/landing-pages/${page.id}/edit`)}
                onDuplicate={() => handleDuplicate(page)}
                onDelete={() => setPageToDelete(page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePageModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadPages();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {pageToDelete && (
        <DeleteModal
          page={pageToDelete}
          onClose={() => setPageToDelete(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}

      {/* Duplicate Page Modal */}
      {pageToDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setPageToDuplicate(null);
              setDuplicateName('');
            }}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Copy className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Duplicate Page</h3>
                <p className="text-sm text-muted-foreground">
                  Create a copy of "{pageToDuplicate.name}"
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                New Page Name
              </label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Enter name for the new page"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !duplicating && duplicateName.trim()) {
                    confirmDuplicate();
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPageToDuplicate(null);
                  setDuplicateName('');
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDuplicate}
                disabled={duplicating || !duplicateName.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {duplicating ? 'Duplicating...' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
