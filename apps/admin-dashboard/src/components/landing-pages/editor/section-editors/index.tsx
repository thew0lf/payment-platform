'use client';

import { X } from 'lucide-react';
import { SectionDetail, SectionStyles } from '@/lib/api/landing-pages';
import { SectionEditorProps } from '../types';
import { getSectionLabel } from '../utils';
import { HeroEditor } from './HeroEditor';
import { FeaturesEditor } from './FeaturesEditor';
import { TestimonialsEditor } from './TestimonialsEditor';
import { PricingEditor } from './PricingEditor';
import { FAQEditor } from './FAQEditor';
import { BackgroundEditor } from './BackgroundEditor';
import {
  CTAEditor,
  NewsletterEditor,
  VideoEditor,
  SpacerEditor,
  DividerEditor,
  AboutEditor,
  LogosEditor,
  StatsEditor,
  ProductsEditor,
  GalleryEditor,
  ContactFormEditor,
  HeaderEditor,
  FooterEditor,
  HTMLBlockEditor,
} from './GenericEditor';

interface SectionEditorPanelProps {
  section: SectionDetail;
  onUpdate: (data: Partial<SectionDetail>) => void;
  onClose: () => void;
}

// Section types that should NOT show background editor (layout elements)
const NO_BACKGROUND_SECTIONS = ['HEADER', 'FOOTER', 'SPACER', 'DIVIDER'];

export function SectionEditorPanel({ section, onUpdate, onClose }: SectionEditorPanelProps) {
  const handleContentUpdate = (contentUpdate: Record<string, any>) => {
    onUpdate({
      content: { ...section.content, ...contentUpdate },
    });
  };

  const handleStyleUpdate = (styleUpdate: Partial<SectionStyles>) => {
    onUpdate({
      styles: { ...section.styles, ...styleUpdate },
    });
  };

  const editorProps: SectionEditorProps = {
    section,
    onUpdate: handleContentUpdate,
    onStyleUpdate: handleStyleUpdate,
  };

  // Check if this section type should show background editor
  const showBackgroundEditor = !NO_BACKGROUND_SECTIONS.includes(section.type);

  const renderEditor = () => {
    switch (section.type) {
      // Navigation
      case 'HEADER':
        return <HeaderEditor {...editorProps} />;
      case 'FOOTER':
        return <FooterEditor {...editorProps} />;

      // Hero variants (Prisma: HERO_CENTERED, HERO_SPLIT, HERO_VIDEO, HERO_CAROUSEL)
      case 'HERO_CENTERED':
      case 'HERO_SPLIT':
      case 'HERO_VIDEO':
      case 'HERO_CAROUSEL':
        return <HeroEditor {...editorProps} />;

      // Features variants (Prisma: FEATURES_GRID, FEATURES_LIST, FEATURES_ICONS)
      case 'FEATURES_GRID':
      case 'FEATURES_LIST':
      case 'FEATURES_ICONS':
        return <FeaturesEditor {...editorProps} />;

      // About variants (Prisma: ABOUT_STORY, ABOUT_TEAM, ABOUT_TIMELINE)
      case 'ABOUT_STORY':
      case 'ABOUT_TEAM':
      case 'ABOUT_TIMELINE':
        return <AboutEditor {...editorProps} />;

      // Testimonials variants (Prisma: TESTIMONIALS_CARDS, TESTIMONIALS_CAROUSEL, TESTIMONIALS_WALL)
      case 'TESTIMONIALS_CARDS':
      case 'TESTIMONIALS_CAROUSEL':
      case 'TESTIMONIALS_WALL':
        return <TestimonialsEditor {...editorProps} />;

      // Logos / Social Proof (Prisma: LOGOS_STRIP)
      case 'LOGOS_STRIP':
        return <LogosEditor {...editorProps} />;

      // Stats (Prisma: STATS_COUNTER)
      case 'STATS_COUNTER':
        return <StatsEditor {...editorProps} />;

      // Pricing variants (Prisma: PRICING_TABLE, PRICING_COMPARISON)
      case 'PRICING_TABLE':
      case 'PRICING_COMPARISON':
        return <PricingEditor {...editorProps} />;

      // Products variants (Prisma: PRODUCTS_GRID, PRODUCTS_CAROUSEL)
      case 'PRODUCTS_GRID':
      case 'PRODUCTS_CAROUSEL':
        return <ProductsEditor {...editorProps} />;

      // CTA variants (Prisma: CTA_BANNER, CTA_SPLIT)
      case 'CTA_BANNER':
      case 'CTA_SPLIT':
        return <CTAEditor {...editorProps} />;

      // Engagement (Prisma: NEWSLETTER, CONTACT_FORM)
      case 'NEWSLETTER':
        return <NewsletterEditor {...editorProps} />;
      case 'CONTACT_FORM':
        return <ContactFormEditor {...editorProps} />;

      // FAQ variants (Prisma: FAQ_ACCORDION, FAQ_GRID)
      case 'FAQ_ACCORDION':
      case 'FAQ_GRID':
        return <FAQEditor {...editorProps} />;

      // Media
      case 'GALLERY_GRID':
      case 'GALLERY_MASONRY':
        return <GalleryEditor {...editorProps} />;
      case 'VIDEO_EMBED':
        return <VideoEditor {...editorProps} />;

      // Layout & Custom
      case 'SPACER':
        return <SpacerEditor {...editorProps} />;
      case 'DIVIDER':
        return <DividerEditor {...editorProps} />;
      case 'HTML_BLOCK':
        return <HTMLBlockEditor {...editorProps} />;

      default:
        return (
          <div className="text-sm text-zinc-400 p-4">
            <p className="mb-2">Editor for {section.type} coming soon.</p>
            <p>You can edit the section name and visibility settings above.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div>
          <h3 className="font-medium text-white">{getSectionLabel(section.type)}</h3>
          <p className="text-xs text-zinc-500">{section.type}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4 text-zinc-400" />
        </button>
      </div>

      {/* Section Settings */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Section Name</label>
          <input
            type="text"
            value={section.name || ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Optional name for reference"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-300">Visible</span>
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
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Background Settings - shown for most section types */}
        {showBackgroundEditor && (
          <div>
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Style</h4>
            <BackgroundEditor
              styles={section.styles}
              onStyleUpdate={handleStyleUpdate}
            />
          </div>
        )}

        {/* Content Fields */}
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Content</h4>
          {renderEditor()}
        </div>
      </div>
    </div>
  );
}
