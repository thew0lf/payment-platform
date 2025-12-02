import { Injectable, Logger } from '@nestjs/common';
import { LandingPageTheme, SectionType } from '@prisma/client';
import {
  PAGE_TEMPLATES,
  TEMPLATE_LIST,
  PageTemplate,
  getTemplateById,
} from '../types/templates';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
}

export interface TemplateGalleryItem {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  previewUrl?: string;
  theme: LandingPageTheme;
  category: string;
  tags: string[];
  sectionCount: number;
  sectionTypes: SectionType[];
  features: string[];
  popularity: number; // 1-100 score
  isNew: boolean;
  isPremium: boolean;
}

export interface TemplateGalleryResponse {
  templates: TemplateGalleryItem[];
  categories: TemplateCategory[];
  total: number;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE METADATA
// Extended template information for the gallery
// ═══════════════════════════════════════════════════════════════

const TEMPLATE_METADATA: Record<string, {
  category: string;
  tags: string[];
  features: string[];
  popularity: number;
  isNew: boolean;
  isPremium: boolean;
  previewUrl?: string;
}> = {
  starter: {
    category: 'general',
    tags: ['minimal', 'clean', 'multipurpose', 'beginner-friendly'],
    features: ['Hero section', 'Features grid', 'Testimonials', 'Pricing table', 'FAQ', 'Newsletter'],
    popularity: 95,
    isNew: false,
    isPremium: false,
    previewUrl: '/preview/starter',
  },
  artisan: {
    category: 'ecommerce',
    tags: ['handmade', 'craft', 'premium', 'boutique', 'warm'],
    features: ['Split hero', 'Story section', 'Testimonials wall', 'Newsletter', 'Instagram-style'],
    popularity: 78,
    isNew: false,
    isPremium: false,
    previewUrl: '/preview/artisan',
  },
  velocity: {
    category: 'saas',
    tags: ['tech', 'startup', 'modern', 'bold', 'developer'],
    features: ['Centered hero', 'Logo strip', 'Feature icons', 'Stats counter', 'Comparison pricing'],
    popularity: 92,
    isNew: true,
    isPremium: false,
    previewUrl: '/preview/velocity',
  },
  luxe: {
    category: 'luxury',
    tags: ['elegant', 'premium', 'sophisticated', 'high-end', 'fashion'],
    features: ['Video hero', 'Carousel testimonials', 'Appointment booking', 'Minimal footer'],
    popularity: 65,
    isNew: false,
    isPremium: true,
    previewUrl: '/preview/luxe',
  },
};

// Category definitions
const CATEGORIES: TemplateCategory[] = [
  {
    id: 'all',
    name: 'All Templates',
    description: 'Browse all available landing page templates',
    templateIds: Object.keys(PAGE_TEMPLATES),
  },
  {
    id: 'general',
    name: 'General Purpose',
    description: 'Versatile templates for any business',
    templateIds: ['starter'],
  },
  {
    id: 'saas',
    name: 'SaaS & Tech',
    description: 'Perfect for software products and tech startups',
    templateIds: ['velocity'],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Designed for online stores and product showcases',
    templateIds: ['artisan'],
  },
  {
    id: 'luxury',
    name: 'Luxury & Premium',
    description: 'Elegant templates for high-end brands',
    templateIds: ['luxe'],
  },
  {
    id: 'services',
    name: 'Professional Services',
    description: 'For agencies, consultants, and B2B businesses',
    templateIds: ['starter'],
  },
];

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class TemplateGalleryService {
  private readonly logger = new Logger(TemplateGalleryService.name);

  /**
   * Get all templates for the gallery
   */
  getGallery(options: {
    category?: string;
    search?: string;
    tags?: string[];
    sortBy?: 'popularity' | 'name' | 'newest';
  } = {}): TemplateGalleryResponse {
    let templates = this.getAllTemplateItems();

    // Filter by category
    if (options.category && options.category !== 'all') {
      const category = CATEGORIES.find(c => c.id === options.category);
      if (category) {
        templates = templates.filter(t => category.templateIds.includes(t.id));
      }
    }

    // Filter by search
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by tags
    if (options.tags?.length) {
      templates = templates.filter(t =>
        options.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Sort
    switch (options.sortBy) {
      case 'name':
        templates.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        templates.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'popularity':
      default:
        templates.sort((a, b) => b.popularity - a.popularity);
    }

    return {
      templates,
      categories: CATEGORIES,
      total: templates.length,
    };
  }

  /**
   * Get a single template by ID with full details
   */
  getTemplateDetail(templateId: string): TemplateGalleryItem | null {
    const template = getTemplateById(templateId);
    if (!template) return null;

    return this.mapToGalleryItem(template);
  }

  /**
   * Get template sections for preview
   */
  getTemplateSections(templateId: string): PageTemplate['sections'] | null {
    const template = getTemplateById(templateId);
    return template?.sections || null;
  }

  /**
   * Get popular templates (for homepage/featured)
   */
  getPopularTemplates(limit: number = 4): TemplateGalleryItem[] {
    return this.getAllTemplateItems()
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Get new templates
   */
  getNewTemplates(): TemplateGalleryItem[] {
    return this.getAllTemplateItems().filter(t => t.isNew);
  }

  /**
   * Get all unique tags from templates
   */
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const meta of Object.values(TEMPLATE_METADATA)) {
      meta.tags.forEach(tag => tagSet.add(tag));
    }
    return Array.from(tagSet).sort();
  }

  /**
   * Get templates similar to a given template
   */
  getSimilarTemplates(templateId: string, limit: number = 3): TemplateGalleryItem[] {
    const template = this.getTemplateDetail(templateId);
    if (!template) return [];

    return this.getAllTemplateItems()
      .filter(t => t.id !== templateId)
      .map(t => ({
        item: t,
        score: this.calculateSimilarity(template, t),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private getAllTemplateItems(): TemplateGalleryItem[] {
    return TEMPLATE_LIST.map(t => this.mapToGalleryItem(t));
  }

  private mapToGalleryItem(template: PageTemplate): TemplateGalleryItem {
    const meta = TEMPLATE_METADATA[template.id] || {
      category: 'general',
      tags: [],
      features: [],
      popularity: 50,
      isNew: false,
      isPremium: false,
    };

    const sectionTypes = template.sections.map(s => s.type);

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      thumbnail: template.thumbnail,
      previewUrl: meta.previewUrl,
      theme: template.theme,
      category: meta.category,
      tags: meta.tags,
      sectionCount: template.sections.length,
      sectionTypes,
      features: meta.features,
      popularity: meta.popularity,
      isNew: meta.isNew,
      isPremium: meta.isPremium,
    };
  }

  private calculateSimilarity(a: TemplateGalleryItem, b: TemplateGalleryItem): number {
    let score = 0;

    // Same category
    if (a.category === b.category) score += 30;

    // Same theme
    if (a.theme === b.theme) score += 20;

    // Shared tags
    const sharedTags = a.tags.filter(t => b.tags.includes(t));
    score += sharedTags.length * 10;

    // Similar section types
    const sharedSections = a.sectionTypes.filter(s => b.sectionTypes.includes(s));
    score += sharedSections.length * 5;

    return score;
  }
}
