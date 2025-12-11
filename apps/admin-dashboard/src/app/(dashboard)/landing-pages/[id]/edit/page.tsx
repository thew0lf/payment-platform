'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  Rocket,
  Settings,
  Palette,
  Globe,
  Plus,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Monitor,
  Tablet,
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
  Code,
  Edit3,
  ExternalLink,
  EyeOff,
  PanelRight,
  PanelRightClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLandingPage,
  LandingPageDetail,
  SectionDetail,
  SectionType,
  LandingPageTheme,
  ColorScheme,
  Typography,
} from '@/lib/api/landing-pages';
import { EditorProvider, useEditor } from '@/components/landing-pages/editor/EditorContext';
import { SectionEditorPanel } from '@/components/landing-pages/editor/section-editors';
import { generatePreviewHtml } from '@/components/landing-pages/editor/preview-renderer';
import { getSectionLabel } from '@/components/landing-pages/editor/utils';
import { DevicePreview } from '@/components/landing-pages/editor/types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SECTION_TYPES: { type: SectionType; label: string; icon: React.ElementType; description: string }[] = [
  // Navigation
  { type: 'HEADER', label: 'Header', icon: Layout, description: 'Navigation bar with logo and menu' },
  { type: 'FOOTER', label: 'Footer', icon: Layout, description: 'Page footer with links' },
  // Hero variants
  { type: 'HERO_CENTERED', label: 'Hero (Centered)', icon: Layout, description: 'Large centered banner with headline and CTA' },
  { type: 'HERO_SPLIT', label: 'Hero (Split)', icon: Layout, description: 'Hero with image on one side' },
  { type: 'HERO_VIDEO', label: 'Hero (Video)', icon: Film, description: 'Hero with video background' },
  { type: 'HERO_CAROUSEL', label: 'Hero (Carousel)', icon: Layout, description: 'Rotating hero slides' },
  // Features
  { type: 'FEATURES_GRID', label: 'Features (Grid)', icon: Star, description: 'Grid of feature cards' },
  { type: 'FEATURES_LIST', label: 'Features (List)', icon: Star, description: 'List of features' },
  { type: 'FEATURES_ICONS', label: 'Features (Icons)', icon: Star, description: 'Feature cards with icons' },
  // About
  { type: 'ABOUT_STORY', label: 'About (Story)', icon: Users, description: 'Company story and information' },
  { type: 'ABOUT_TEAM', label: 'About (Team)', icon: Users, description: 'Team members showcase' },
  { type: 'ABOUT_TIMELINE', label: 'About (Timeline)', icon: Users, description: 'Company timeline/history' },
  // Testimonials
  { type: 'TESTIMONIALS_CARDS', label: 'Testimonials (Cards)', icon: MessageSquare, description: 'Customer reviews in cards' },
  { type: 'TESTIMONIALS_CAROUSEL', label: 'Testimonials (Carousel)', icon: MessageSquare, description: 'Rotating testimonials' },
  { type: 'TESTIMONIALS_WALL', label: 'Testimonials (Wall)', icon: MessageSquare, description: 'Wall of testimonials' },
  // Social Proof
  { type: 'LOGOS_STRIP', label: 'Logo Strip', icon: Image, description: 'Partner/client logo strip' },
  { type: 'STATS_COUNTER', label: 'Stats Counter', icon: Zap, description: 'Key metrics and numbers' },
  // Pricing
  { type: 'PRICING_TABLE', label: 'Pricing Table', icon: DollarSign, description: 'Pricing tiers table' },
  { type: 'PRICING_COMPARISON', label: 'Pricing Comparison', icon: DollarSign, description: 'Feature comparison pricing' },
  // Products
  { type: 'PRODUCTS_GRID', label: 'Products (Grid)', icon: ShoppingBag, description: 'Product showcase grid' },
  { type: 'PRODUCTS_CAROUSEL', label: 'Products (Carousel)', icon: ShoppingBag, description: 'Product carousel' },
  // CTAs
  { type: 'CTA_BANNER', label: 'CTA Banner', icon: Rocket, description: 'Full-width call to action' },
  { type: 'CTA_SPLIT', label: 'CTA Split', icon: Rocket, description: 'Split layout call to action' },
  // Engagement
  { type: 'NEWSLETTER', label: 'Newsletter', icon: Mail, description: 'Email signup form' },
  { type: 'CONTACT_FORM', label: 'Contact Form', icon: Phone, description: 'Contact information form' },
  // FAQ
  { type: 'FAQ_ACCORDION', label: 'FAQ (Accordion)', icon: HelpCircle, description: 'Expandable FAQ items' },
  { type: 'FAQ_GRID', label: 'FAQ (Grid)', icon: HelpCircle, description: 'FAQ in grid layout' },
  // Media
  { type: 'GALLERY_GRID', label: 'Gallery (Grid)', icon: Image, description: 'Image gallery grid' },
  { type: 'GALLERY_MASONRY', label: 'Gallery (Masonry)', icon: Image, description: 'Masonry image gallery' },
  { type: 'VIDEO_EMBED', label: 'Video Embed', icon: Film, description: 'Embedded video section' },
  // Layout
  { type: 'SPACER', label: 'Spacer', icon: Minus, description: 'Empty space divider' },
  { type: 'DIVIDER', label: 'Divider', icon: Rows, description: 'Horizontal line divider' },
  { type: 'HTML_BLOCK', label: 'HTML Block', icon: Code, description: 'Custom HTML content' },
];

// Theme presets with full color schemes and typography
const THEME_PRESETS: Record<LandingPageTheme, {
  label: string;
  colorScheme: ColorScheme;
  typography: Typography;
}> = {
  STARTER: {
    label: 'Starter',
    colorScheme: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  ARTISAN: {
    label: 'Artisan',
    colorScheme: {
      primary: '#92400E',
      secondary: '#78350F',
      accent: '#D97706',
      background: '#FFFBEB',
      surface: '#FEF3C7',
      text: '#451A03',
      textMuted: '#78716C',
      border: '#FCD34D',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lora',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  VELOCITY: {
    label: 'Velocity',
    colorScheme: {
      primary: '#EF4444',
      secondary: '#DC2626',
      accent: '#F97316',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      border: '#334155',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Bebas Neue',
      bodyFont: 'Roboto',
      baseFontSize: 16,
      headingSizes: { h1: '4rem', h2: '3rem', h3: '2rem', h4: '1.5rem' },
    },
  },
  LUXE: {
    label: 'Luxe',
    colorScheme: {
      primary: '#A78BFA',
      secondary: '#7C3AED',
      accent: '#C4B5FD',
      background: '#18181B',
      surface: '#27272A',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      border: '#3F3F46',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Montserrat',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  WELLNESS: {
    label: 'Wellness',
    colorScheme: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#34D399',
      background: '#ECFDF5',
      surface: '#D1FAE5',
      text: '#064E3B',
      textMuted: '#6B7280',
      border: '#A7F3D0',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Nunito',
      bodyFont: 'Open Sans',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  FOODIE: {
    label: 'Foodie',
    colorScheme: {
      primary: '#DC2626',
      secondary: '#B91C1C',
      accent: '#F59E0B',
      background: '#FEF2F2',
      surface: '#FECACA',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#FCA5A5',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Poppins',
      bodyFont: 'Source Sans Pro',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  PROFESSIONAL: {
    label: 'Professional',
    colorScheme: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      accent: '#3B82F6',
      background: '#F8FAFC',
      surface: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#CBD5E1',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: 16,
      headingSizes: { h1: '3rem', h2: '2.25rem', h3: '1.5rem', h4: '1.25rem' },
    },
  },
  CREATOR: {
    label: 'Creator',
    colorScheme: {
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#F472B6',
      background: '#FDF4FF',
      surface: '#FAE8FF',
      text: '#1F2937',
      textMuted: '#6B7280',
      border: '#F5D0FE',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'DM Sans',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
  MARKETPLACE: {
    label: 'Marketplace',
    colorScheme: {
      primary: '#0891B2',
      secondary: '#0E7490',
      accent: '#22D3EE',
      background: '#FFFFFF',
      surface: '#F0FDFA',
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#99F6E4',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      baseFontSize: 16,
      headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '1.75rem', h4: '1.25rem' },
    },
  },
};

const THEME_OPTIONS = Object.entries(THEME_PRESETS).map(([theme, preset]) => ({
  theme: theme as LandingPageTheme,
  label: preset.label,
  color: preset.colorScheme.primary,
}));

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
      <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold text-foreground">Add Section</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-3 gap-3">
          {SECTION_TYPES.map(({ type, label, icon: Icon, description }) => (
            <button
              key={type}
              onClick={() => {
                onAdd(type);
                onClose();
              }}
              className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/50 hover:border-blue-500 hover:bg-blue-500/10 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-muted group-hover:bg-blue-600 transition-colors">
                <Icon className="h-5 w-5 text-foreground group-hover:text-foreground" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground truncate">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION LIST ITEM
// ═══════════════════════════════════════════════════════════════

interface SectionListItemProps {
  section: SectionDetail;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
}

function SectionListItem({
  section,
  index,
  total,
  isSelected,
  onSelect,
  onMove,
  onDelete,
}: SectionListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sectionConfig = SECTION_TYPES.find((s) => s.type === section.type);
  const Icon = sectionConfig?.icon || Layout;

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
          : 'border-border hover:border-border bg-muted/50'
      )}
      onClick={onSelect}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
      <div className={cn(
        'p-1.5 rounded shrink-0',
        isSelected ? 'bg-blue-600' : 'bg-muted'
      )}>
        <Icon className="h-3.5 w-3.5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate">
          {section.name || getSectionLabel(section.type)}
        </div>
        {!section.enabled && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <EyeOff className="h-3 w-3" />
            Hidden
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove('up');
          }}
          disabled={index === 0}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove('down');
          }}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-1 rounded hover:bg-red-500/20"
            title="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </button>

          {/* Delete Confirmation Popover */}
          {showDeleteConfirm && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 p-3">
                <p className="text-xs text-muted-foreground mb-2">Delete this section?</p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EDITOR CONTENT (Inside Provider)
// ═══════════════════════════════════════════════════════════════

function EditorContent() {
  const {
    page,
    selectedSectionId,
    setSelectedSectionId,
    editorMode,
    setEditorMode,
    devicePreview,
    setDevicePreview,
    addSection,
    deleteSection,
    moveSection,
    updateSection,
    updatePage,
    savePage,
    deployPage,
    hasChanges,
    saving,
    deploying,
  } = useEditor();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SidebarTab>('sections');
  const [showAddSection, setShowAddSection] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const selectedSection = useMemo(() => {
    return page.sections.find((s) => s.id === selectedSectionId) || null;
  }, [page.sections, selectedSectionId]);

  const previewHtml = useMemo(() => {
    return generatePreviewHtml(page);
  }, [page]);

  const deviceWidth = useMemo(() => {
    switch (devicePreview) {
      case 'mobile':
        return 'w-[375px]';
      case 'tablet':
        return 'w-[768px]';
      case 'desktop':
      default:
        return 'w-full max-w-5xl';
    }
  }, [devicePreview]);

  const handleSectionUpdate = useCallback(
    (data: Partial<SectionDetail>) => {
      if (selectedSectionId) {
        updateSection(selectedSectionId, data);
      }
    },
    [selectedSectionId, updateSection]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/landing-pages"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <input
              type="text"
              value={page.name}
              onChange={(e) => updatePage({ name: e.target.value })}
              className="bg-transparent text-foreground font-medium focus:outline-none border-b border-transparent hover:border-border focus:border-blue-500 px-1"
            />
            <div className="text-xs text-muted-foreground">/{page.slug}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit/Preview Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setEditorMode('edit')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2',
                editorMode === 'edit' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2',
                editorMode === 'preview' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>

          {/* Device Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setDevicePreview('desktop')}
              className={cn(
                'p-1.5 rounded transition-colors',
                devicePreview === 'desktop' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Desktop"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevicePreview('tablet')}
              className={cn(
                'p-1.5 rounded transition-colors',
                devicePreview === 'tablet' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Tablet"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevicePreview('mobile')}
              className={cn(
                'p-1.5 rounded transition-colors',
                devicePreview === 'mobile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Mobile"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={savePage}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={deployPage}
            disabled={deploying}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 text-foreground hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Rocket className="h-4 w-4" />
            {deploying ? 'Deploying...' : 'Deploy'}
          </button>

          {(page.platformUrl || page.clientUrl) && (
            <a
              href={page.platformUrl || page.clientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="View published page"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tabs */}
        {editorMode === 'edit' && (
          <div className="w-12 border-r border-border bg-card flex flex-col items-center py-2 gap-1 shrink-0">
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
                    ? 'bg-blue-600 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={label}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}

        {/* Left Panel */}
        {editorMode === 'edit' && (
          <div className="w-72 border-r border-border bg-card/50 flex flex-col shrink-0">
            {activeTab === 'sections' && (
              <>
                <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                  <h3 className="font-medium text-foreground text-sm">Sections</h3>
                  <button
                    onClick={() => setShowAddSection(true)}
                    className="p-1.5 rounded-lg bg-blue-600 text-foreground hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {page.sections.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground text-sm mb-3">No sections yet</div>
                      <button
                        onClick={() => setShowAddSection(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add Section
                      </button>
                    </div>
                  ) : (
                    page.sections.map((section, index) => (
                      <SectionListItem
                        key={section.id}
                        section={section}
                        index={index}
                        total={page.sections.length}
                        isSelected={selectedSectionId === section.id}
                        onSelect={() => setSelectedSectionId(section.id)}
                        onMove={(direction) => moveSection(section.id, direction)}
                        onDelete={() => deleteSection(section.id)}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'design' && (
              <div className="p-4 space-y-6 overflow-y-auto">
                <div>
                  <h3 className="font-medium text-foreground text-sm mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(({ theme, label, color }) => (
                      <button
                        key={theme}
                        onClick={() => {
                          // Apply full theme preset including colorScheme and typography
                          const preset = THEME_PRESETS[theme];
                          updatePage({
                            theme,
                            colorScheme: preset.colorScheme,
                            typography: preset.typography,
                          });
                        }}
                        className={cn(
                          'p-2 rounded-lg border text-xs transition-all',
                          page.theme === theme
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <div
                          className="w-full h-4 rounded mb-1"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-foreground">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground text-sm mb-3">Colors</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'primary', label: 'Primary', default: '#3B82F6' },
                      { key: 'secondary', label: 'Secondary', default: '#1E40AF' },
                      { key: 'accent', label: 'Accent', default: '#60A5FA' },
                      { key: 'background', label: 'Background', default: '#FFFFFF' },
                      { key: 'text', label: 'Text', default: '#1F2937' },
                      { key: 'muted', label: 'Muted Text', default: '#6B7280' },
                    ].map(({ key, label, default: defaultVal }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(page.colorScheme as any)?.[key] || defaultVal}
                            onChange={(e) =>
                              updatePage({
                                colorScheme: { ...page.colorScheme, [key]: e.target.value },
                              })
                            }
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <span className="text-xs text-muted-foreground font-mono">
                            {(page.colorScheme as any)?.[key] || defaultVal}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-foreground text-sm mb-3">Typography</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Heading Font</label>
                      <select
                        value={page.typography?.headingFont || 'Inter'}
                        onChange={(e) =>
                          updatePage({
                            typography: { ...page.typography, headingFont: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Bebas Neue">Bebas Neue</option>
                        <option value="Cormorant Garamond">Cormorant Garamond</option>
                        <option value="Nunito">Nunito</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Space Grotesk">Space Grotesk</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Montserrat">Montserrat</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Body Font</label>
                      <select
                        value={page.typography?.bodyFont || 'Inter'}
                        onChange={(e) =>
                          updatePage({
                            typography: { ...page.typography, bodyFont: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Lora">Lora</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Source Sans Pro">Source Sans Pro</option>
                        <option value="DM Sans">DM Sans</option>
                        <option value="Nunito">Nunito</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-4 overflow-y-auto">
                <h3 className="font-medium text-foreground text-sm">Page Settings</h3>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={page.slug}
                    onChange={(e) => updatePage({ slug: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Custom CSS</label>
                  <textarea
                    value={page.customCss || ''}
                    onChange={(e) => updatePage({ customCss: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm font-mono resize-none focus:border-blue-500 focus:outline-none"
                    rows={5}
                    placeholder="/* Custom styles */"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Custom JavaScript</label>
                  <textarea
                    value={page.customJs || ''}
                    onChange={(e) => updatePage({ customJs: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm font-mono resize-none focus:border-blue-500 focus:outline-none"
                    rows={5}
                    placeholder="// Custom scripts"
                  />
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="p-4 space-y-4 overflow-y-auto">
                <h3 className="font-medium text-foreground text-sm">SEO Settings</h3>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={page.metaTitle || ''}
                    onChange={(e) => updatePage({ metaTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Page title for search engines"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {(page.metaTitle || '').length}/60 characters
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Meta Description</label>
                  <textarea
                    value={page.metaDescription || ''}
                    onChange={(e) => updatePage({ metaDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm resize-none focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="Page description for search results"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {(page.metaDescription || '').length}/160 characters
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Google Analytics ID</label>
                  <input
                    type="text"
                    value={page.googleAnalyticsId || ''}
                    onChange={(e) => updatePage({ googleAnalyticsId: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="G-XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Facebook Pixel ID</label>
                  <input
                    type="text"
                    value={page.facebookPixelId || ''}
                    onChange={(e) => updatePage({ facebookPixelId: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="XXXXXXXXXX"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 bg-background overflow-hidden flex flex-col">
          {/* Preview container with proper centering */}
          <div className="flex-1 overflow-auto p-6 flex justify-center">
            <div
              className={cn(
                'bg-white rounded-lg shadow-2xl overflow-hidden transition-all h-fit',
                deviceWidth
              )}
            >
              <iframe
                key={previewHtml}
                srcDoc={previewHtml}
                className="w-full h-[800px] border-0"
                title="Page Preview"
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Section Editor */}
        {editorMode === 'edit' && selectedSection && (
          <SectionEditorPanel
            section={selectedSection}
            onUpdate={handleSectionUpdate}
            onClose={() => setSelectedSectionId(null)}
          />
        )}
      </div>

      {/* Modals */}
      {showAddSection && (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onAdd={(type) => addSection(type)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE WRAPPER
// ═══════════════════════════════════════════════════════════════

export default function PageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params?.id as string;

  const [page, setPage] = useState<LandingPageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLandingPage(pageId);
      setPage(data);
    } catch (err: any) {
      console.error('Failed to load page:', err);
      setError(err.message || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Page not found'}</div>
          <Link
            href="/landing-pages"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Landing Pages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EditorProvider initialPage={page} pageId={pageId} onPageUpdate={setPage}>
      <EditorContent />
    </EditorProvider>
  );
}
