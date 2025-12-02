'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  Rocket,
  Settings,
  Palette,
  Type,
  Globe,
  Code,
  Plus,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Monitor,
  Smartphone,
  RefreshCw,
  X,
  Layout,
  Image,
  MessageSquare,
  Users,
  Star,
  DollarSign,
  ShoppingBag,
  Zap,
  Mail,
  Phone,
  HelpCircle,
  Film,
  Minus,
  Rows,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLandingPage,
  updateLandingPage,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  deployLandingPage,
  LandingPageDetail,
  SectionDetail,
  SectionType,
  LandingPageTheme,
  UpdateLandingPageInput,
  CreateSectionInput,
} from '@/lib/api/landing-pages';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SECTION_TYPES: { type: SectionType; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'HERO', label: 'Hero', icon: Layout, description: 'Large banner with headline and CTA' },
  { type: 'FEATURES', label: 'Features', icon: Star, description: 'Grid of feature cards' },
  { type: 'ABOUT', label: 'About', icon: Users, description: 'Company story and team' },
  { type: 'TESTIMONIALS', label: 'Testimonials', icon: MessageSquare, description: 'Customer reviews carousel' },
  { type: 'LOGOS', label: 'Logos', icon: Image, description: 'Partner/client logo strip' },
  { type: 'STATS', label: 'Stats', icon: Zap, description: 'Key metrics and numbers' },
  { type: 'PRICING', label: 'Pricing', icon: DollarSign, description: 'Pricing tiers table' },
  { type: 'PRODUCTS', label: 'Products', icon: ShoppingBag, description: 'Product showcase grid' },
  { type: 'CTA', label: 'Call to Action', icon: Rocket, description: 'Action banner with button' },
  { type: 'NEWSLETTER', label: 'Newsletter', icon: Mail, description: 'Email signup form' },
  { type: 'CONTACT_FORM', label: 'Contact Form', icon: Phone, description: 'Contact information form' },
  { type: 'FAQ', label: 'FAQ', icon: HelpCircle, description: 'Frequently asked questions' },
  { type: 'GALLERY', label: 'Gallery', icon: Image, description: 'Image gallery grid' },
  { type: 'VIDEO', label: 'Video', icon: Film, description: 'Embedded video section' },
  { type: 'SPACER', label: 'Spacer', icon: Minus, description: 'Empty space divider' },
  { type: 'DIVIDER', label: 'Divider', icon: Rows, description: 'Horizontal line divider' },
];

const THEME_OPTIONS: { theme: LandingPageTheme; label: string; color: string }[] = [
  { theme: 'STARTER', label: 'Starter', color: '#3B82F6' },
  { theme: 'ARTISAN', label: 'Artisan', color: '#92400E' },
  { theme: 'VELOCITY', label: 'Velocity', color: '#EF4444' },
  { theme: 'LUXE', label: 'Luxe', color: '#A78BFA' },
  { theme: 'WELLNESS', label: 'Wellness', color: '#059669' },
  { theme: 'FOODIE', label: 'Foodie', color: '#DC2626' },
  { theme: 'PROFESSIONAL', label: 'Professional', color: '#2563EB' },
  { theme: 'CREATOR', label: 'Creator', color: '#EC4899' },
  { theme: 'MARKETPLACE', label: 'Marketplace', color: '#0891B2' },
];

// ═══════════════════════════════════════════════════════════════
// SIDEBAR TABS
// ═══════════════════════════════════════════════════════════════

type SidebarTab = 'sections' | 'design' | 'settings' | 'seo';

// ═══════════════════════════════════════════════════════════════
// ADD SECTION MODAL
// ═══════════════════════════════════════════════════════════════

interface AddSectionModalProps {
  onClose: () => void;
  onAdd: (type: SectionType) => void;
}

function AddSectionModal({ onClose, onAdd }: AddSectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-lg font-semibold text-white">Add Section</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-3">
          {SECTION_TYPES.map(({ type, label, icon: Icon, description }) => (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className="flex items-start gap-3 p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:border-blue-500 hover:bg-blue-500/10 text-left transition-all"
            >
              <div className="p-2 rounded-lg bg-zinc-700">
                <Icon className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <div className="font-medium text-white">{label}</div>
                <div className="text-sm text-zinc-400">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION EDITOR PANEL
// ═══════════════════════════════════════════════════════════════

interface SectionEditorProps {
  section: SectionDetail;
  onUpdate: (data: Partial<SectionDetail>) => void;
  onClose: () => void;
}

function SectionEditor({ section, onUpdate, onClose }: SectionEditorProps) {
  const [content, setContent] = useState(section.content);

  const handleContentChange = (key: string, value: any) => {
    const newContent = { ...content, [key]: value };
    setContent(newContent);
    onUpdate({ content: newContent });
  };

  const renderContentFields = () => {
    switch (section.type) {
      case 'HERO':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Headline</label>
              <input
                type="text"
                value={content.headline || ''}
                onChange={(e) => handleContentChange('headline', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="Your amazing headline"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Subheadline</label>
              <textarea
                value={content.subheadline || ''}
                onChange={(e) => handleContentChange('subheadline', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white resize-none"
                rows={2}
                placeholder="Supporting text"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">CTA Text</label>
                <input
                  type="text"
                  value={content.ctaText || ''}
                  onChange={(e) => handleContentChange('ctaText', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  placeholder="Get Started"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">CTA URL</label>
                <input
                  type="text"
                  value={content.ctaUrl || ''}
                  onChange={(e) => handleContentChange('ctaUrl', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  placeholder="#signup"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Background Image URL</label>
              <input
                type="text"
                value={content.backgroundImage || ''}
                onChange={(e) => handleContentChange('backgroundImage', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="https://..."
              />
            </div>
          </>
        );

      case 'CTA':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Headline</label>
              <input
                type="text"
                value={content.headline || ''}
                onChange={(e) => handleContentChange('headline', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Subheadline</label>
              <input
                type="text"
                value={content.subheadline || ''}
                onChange={(e) => handleContentChange('subheadline', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Button Text</label>
                <input
                  type="text"
                  value={content.ctaText || ''}
                  onChange={(e) => handleContentChange('ctaText', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Button URL</label>
                <input
                  type="text"
                  value={content.ctaUrl || ''}
                  onChange={(e) => handleContentChange('ctaUrl', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
            </div>
          </>
        );

      case 'FEATURES':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Section Headline</label>
              <input
                type="text"
                value={content.headline || ''}
                onChange={(e) => handleContentChange('headline', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="Our Features"
              />
            </div>
            <div className="text-sm text-zinc-400">
              Feature items can be managed in the full editor. This section shows {(content.items || []).length} features.
            </div>
          </>
        );

      case 'FAQ':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Section Headline</label>
              <input
                type="text"
                value={content.headline || ''}
                onChange={(e) => handleContentChange('headline', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                placeholder="Frequently Asked Questions"
              />
            </div>
            <div className="text-sm text-zinc-400">
              FAQ items: {(content.items || []).length}
            </div>
          </>
        );

      case 'SPACER':
        return (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Height (px)</label>
            <input
              type="number"
              value={content.height || 80}
              onChange={(e) => handleContentChange('height', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            />
          </div>
        );

      default:
        return (
          <div className="text-sm text-zinc-400">
            Section content can be edited in the full editor view.
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="font-medium text-white">Edit {section.type.replace('_', ' ')}</h3>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800">
          <X className="h-4 w-4 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Section Name</label>
          <input
            type="text"
            value={section.name || ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            placeholder="Optional name for reference"
          />
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-300">Enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={section.hideOnMobile}
              onChange={(e) => onUpdate({ hideOnMobile: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-300">Hide on mobile</span>
          </label>
        </div>

        <hr className="border-zinc-800" />

        {/* Content Fields */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-300">Content</h4>
          {renderContentFields()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE EDITOR
// ═══════════════════════════════════════════════════════════════

export default function PageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.id as string;

  const [page, setPage] = useState<LandingPageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('sections');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDetail | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLandingPage(pageId);
      setPage(data);
    } catch (err) {
      console.error('Failed to load page:', err);
      alert('Failed to load page');
      router.push('/landing-pages');
    } finally {
      setLoading(false);
    }
  }, [pageId, router]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const updateData: UpdateLandingPageInput = {
        name: page.name,
        slug: page.slug,
        theme: page.theme,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        customCss: page.customCss,
        customJs: page.customJs,
        googleAnalyticsId: page.googleAnalyticsId,
        facebookPixelId: page.facebookPixelId,
      };
      await updateLandingPage(pageId, updateData);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to save:', err);
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!page) return;
    if (!confirm('Deploy this page? It will be publicly accessible.')) return;

    setDeploying(true);
    try {
      // Generate simple HTML for now - in production this would use the renderer service
      const html = generatePreviewHtml(page);
      const result = await deployLandingPage(pageId, html);
      if (result.success) {
        alert(`Deployed! URL: ${result.url}`);
        loadPage();
      }
    } catch (err: any) {
      console.error('Failed to deploy:', err);
      alert(err.message || 'Failed to deploy');
    } finally {
      setDeploying(false);
    }
  };

  const handleAddSection = async (type: SectionType) => {
    if (!page) return;
    setShowAddSection(false);

    try {
      const defaultContent = getDefaultContent(type);
      const input: CreateSectionInput = {
        type,
        order: page.sections.length,
        content: defaultContent,
        enabled: true,
      };
      const updated = await addSection(pageId, input);
      setPage(updated);
    } catch (err: any) {
      console.error('Failed to add section:', err);
      alert(err.message || 'Failed to add section');
    }
  };

  const handleUpdateSection = async (sectionId: string, data: Partial<SectionDetail>) => {
    if (!page) return;

    try {
      const updated = await updateSection(pageId, sectionId, data);
      setPage(updated);
      if (editingSection?.id === sectionId) {
        const updatedSection = updated.sections.find((s) => s.id === sectionId);
        if (updatedSection) setEditingSection(updatedSection);
      }
    } catch (err: any) {
      console.error('Failed to update section:', err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!page) return;
    if (!confirm('Delete this section?')) return;

    try {
      const updated = await deleteSection(pageId, sectionId);
      setPage(updated);
      if (editingSection?.id === sectionId) {
        setEditingSection(null);
      }
    } catch (err: any) {
      console.error('Failed to delete section:', err);
      alert(err.message || 'Failed to delete section');
    }
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    if (!page) return;

    const currentIndex = page.sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= page.sections.length) return;

    const newOrder = [...page.sections];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    try {
      const updated = await reorderSections(pageId, newOrder.map((s) => s.id));
      setPage(updated);
    } catch (err: any) {
      console.error('Failed to reorder:', err);
    }
  };

  const updatePageField = (field: keyof LandingPageDetail, value: any) => {
    if (!page) return;
    setPage({ ...page, [field]: value });
    setHasChanges(true);
  };

  if (loading || !page) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Bar */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/landing-pages"
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400" />
          </Link>
          <div>
            <input
              type="text"
              value={page.name}
              onChange={(e) => updatePageField('name', e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent hover:border-zinc-600 focus:border-blue-500 px-1"
            />
            <div className="text-xs text-zinc-500">/{page.slug}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview Mode Toggle */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={cn(
                'p-1.5 rounded',
                previewMode === 'desktop' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={cn(
                'p-1.5 rounded',
                previewMode === 'mobile' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Rocket className="h-4 w-4" />
            {deploying ? 'Deploying...' : 'Deploy'}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Tabs */}
        <div className="w-12 border-r border-zinc-800 bg-zinc-900 flex flex-col items-center py-2 gap-1">
          {[
            { id: 'sections' as const, icon: Layout, label: 'Sections' },
            { id: 'design' as const, icon: Palette, label: 'Design' },
            { id: 'settings' as const, icon: Settings, label: 'Settings' },
            { id: 'seo' as const, icon: Globe, label: 'SEO' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'p-2.5 rounded-lg transition-colors',
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        {/* Left Panel */}
        <div className="w-72 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
          {activeTab === 'sections' && (
            <>
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-medium text-white text-sm">Sections</h3>
                <button
                  onClick={() => setShowAddSection(true)}
                  className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {page.sections.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">
                    No sections yet. Click + to add one.
                  </div>
                ) : (
                  page.sections.map((section, index) => (
                    <div
                      key={section.id}
                      className={cn(
                        'group flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer',
                        editingSection?.id === section.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50'
                      )}
                      onClick={() => setEditingSection(section)}
                    >
                      <GripVertical className="h-4 w-4 text-zinc-600 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {section.name || section.type.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-zinc-500">{section.type}</div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'up'); }}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, 'down'); }}
                          disabled={index === page.sections.length - 1}
                          className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                          className="p-1 rounded hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'design' && (
            <div className="p-4 space-y-4">
              <h3 className="font-medium text-white text-sm">Theme</h3>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map(({ theme, label, color }) => (
                  <button
                    key={theme}
                    onClick={() => updatePageField('theme', theme)}
                    className={cn(
                      'p-2 rounded-lg border text-xs transition-all',
                      page.theme === theme
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-zinc-700 hover:border-zinc-600'
                    )}
                  >
                    <div
                      className="w-full h-4 rounded mb-1"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-zinc-300">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 space-y-4">
              <h3 className="font-medium text-white text-sm">Page Settings</h3>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={page.slug}
                  onChange={(e) => updatePageField('slug', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Custom CSS</label>
                <textarea
                  value={page.customCss || ''}
                  onChange={(e) => updatePageField('customCss', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono resize-none"
                  rows={4}
                  placeholder="/* Custom styles */"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Custom JavaScript</label>
                <textarea
                  value={page.customJs || ''}
                  onChange={(e) => updatePageField('customJs', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono resize-none"
                  rows={4}
                  placeholder="// Custom scripts"
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="p-4 space-y-4">
              <h3 className="font-medium text-white text-sm">SEO Settings</h3>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={page.metaTitle || ''}
                  onChange={(e) => updatePageField('metaTitle', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                  placeholder="Page title for search engines"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Meta Description</label>
                <textarea
                  value={page.metaDescription || ''}
                  onChange={(e) => updatePageField('metaDescription', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm resize-none"
                  rows={3}
                  placeholder="Page description for search results"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Google Analytics ID</label>
                <input
                  type="text"
                  value={page.googleAnalyticsId || ''}
                  onChange={(e) => updatePageField('googleAnalyticsId', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                  placeholder="UA-XXXXXXX-X or G-XXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Facebook Pixel ID</label>
                <input
                  type="text"
                  value={page.facebookPixelId || ''}
                  onChange={(e) => updatePageField('facebookPixelId', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                  placeholder="XXXXXXXXXX"
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-zinc-950 p-6 flex items-start justify-center overflow-auto">
          <div
            className={cn(
              'bg-white rounded-lg shadow-2xl overflow-hidden transition-all',
              previewMode === 'desktop' ? 'w-full max-w-5xl' : 'w-[375px]'
            )}
          >
            <iframe
              srcDoc={generatePreviewHtml(page)}
              className="w-full h-[600px] border-0"
              title="Page Preview"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddSection && (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onAdd={handleAddSection}
        />
      )}

      {editingSection && (
        <SectionEditor
          section={editingSection}
          onUpdate={(data) => handleUpdateSection(editingSection.id, data)}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getDefaultContent(type: SectionType): Record<string, any> {
  switch (type) {
    case 'HERO':
      return {
        headline: 'Welcome to Our Site',
        subheadline: 'The best solution for your needs',
        ctaText: 'Get Started',
        ctaUrl: '#',
      };
    case 'CTA':
      return {
        headline: 'Ready to Get Started?',
        subheadline: 'Join thousands of satisfied customers',
        ctaText: 'Sign Up Now',
        ctaUrl: '#',
      };
    case 'FEATURES':
      return {
        headline: 'Our Features',
        items: [
          { title: 'Feature 1', description: 'Description of feature 1' },
          { title: 'Feature 2', description: 'Description of feature 2' },
          { title: 'Feature 3', description: 'Description of feature 3' },
        ],
      };
    case 'FAQ':
      return {
        headline: 'Frequently Asked Questions',
        items: [
          { question: 'What is this product?', answer: 'This is a great product that helps you achieve your goals.' },
          { question: 'How does it work?', answer: 'It works seamlessly to provide you with the best experience.' },
        ],
      };
    case 'SPACER':
      return { height: 80 };
    case 'DIVIDER':
      return { style: 'solid', thickness: 1 };
    default:
      return {};
  }
}

function generatePreviewHtml(page: LandingPageDetail): string {
  const colors = page.colorScheme;
  const fonts = page.typography;

  const sectionsHtml = page.sections
    .filter((s) => s.enabled)
    .map((section) => renderSection(section, colors))
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.metaTitle || page.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=${fonts.headingFont.replace(' ', '+')}:wght@400;600;700&family=${fonts.bodyFont.replace(' ', '+')}:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: '${fonts.bodyFont}', sans-serif;
      font-size: ${fonts.baseFontSize}px;
      background: ${colors.background};
      color: ${colors.text};
      line-height: 1.6;
    }
    h1, h2, h3, h4 { font-family: '${fonts.headingFont}', sans-serif; font-weight: 700; }
    h1 { font-size: ${fonts.headingSizes.h1}; }
    h2 { font-size: ${fonts.headingSizes.h2}; }
    h3 { font-size: ${fonts.headingSizes.h3}; }
    h4 { font-size: ${fonts.headingSizes.h4}; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: ${colors.primary};
      color: white;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    ${page.customCss || ''}
  </style>
</head>
<body>
  ${sectionsHtml}
  ${page.customJs ? `<script>${page.customJs}</script>` : ''}
</body>
</html>
`;
}

function renderSection(section: SectionDetail, colors: LandingPageDetail['colorScheme']): string {
  const content = section.content;

  switch (section.type) {
    case 'HERO':
      return `
<section style="padding: 80px 0; background: ${content.backgroundImage ? `url(${content.backgroundImage}) center/cover` : colors.surface}; text-align: center;">
  <div class="container">
    <h1 style="margin-bottom: 16px;">${content.headline || ''}</h1>
    ${content.subheadline ? `<p style="font-size: 1.25rem; color: ${colors.textMuted}; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">${content.subheadline}</p>` : ''}
    ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" class="btn">${content.ctaText}</a>` : ''}
  </div>
</section>`;

    case 'CTA':
      return `
<section style="padding: 64px 0; background: ${colors.primary}; text-align: center;">
  <div class="container">
    <h2 style="color: white; margin-bottom: 12px;">${content.headline || ''}</h2>
    ${content.subheadline ? `<p style="color: rgba(255,255,255,0.8); margin-bottom: 24px;">${content.subheadline}</p>` : ''}
    ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" style="background: white; color: ${colors.primary};" class="btn">${content.ctaText}</a>` : ''}
  </div>
</section>`;

    case 'FEATURES':
      const featuresItems = (content.items || []).map((item: any) => `
<div style="flex: 1; min-width: 250px; padding: 24px; background: ${colors.surface}; border-radius: 12px;">
  <h3 style="margin-bottom: 8px;">${item.title}</h3>
  <p style="color: ${colors.textMuted};">${item.description}</p>
</div>`).join('');
      return `
<section style="padding: 64px 0;">
  <div class="container">
    ${content.headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${content.headline}</h2>` : ''}
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      ${featuresItems}
    </div>
  </div>
</section>`;

    case 'FAQ':
      const faqItems = (content.items || []).map((item: any) => `
<div style="padding: 20px 0; border-bottom: 1px solid ${colors.border};">
  <h4 style="margin-bottom: 8px;">${item.question}</h4>
  <p style="color: ${colors.textMuted};">${item.answer}</p>
</div>`).join('');
      return `
<section style="padding: 64px 0;">
  <div class="container" style="max-width: 800px;">
    ${content.headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${content.headline}</h2>` : ''}
    ${faqItems}
  </div>
</section>`;

    case 'SPACER':
      return `<div style="height: ${content.height || 80}px;"></div>`;

    case 'DIVIDER':
      return `
<div class="container">
  <hr style="border: none; border-top: ${content.thickness || 1}px ${content.style || 'solid'} ${colors.border}; margin: 32px 0;">
</div>`;

    default:
      return `
<section style="padding: 64px 0; background: ${colors.surface};">
  <div class="container" style="text-align: center;">
    <p style="color: ${colors.textMuted};">[${section.type} section - configure in editor]</p>
  </div>
</section>`;
  }
}
