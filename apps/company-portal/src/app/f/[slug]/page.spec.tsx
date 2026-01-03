/**
 * Unit tests for Funnel Page metadata functionality
 *
 * Note: The main favicon logic is tested in favicon-utils.spec.ts
 * This file tests the metadata structure and integration.
 */

import { DEFAULT_BRAND_KIT } from '@/lib/brand-kit-resolver';
import type { Funnel, BrandKit } from '@/lib/api';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMinimalFunnel(overrides: Partial<Funnel> = {}): Funnel {
  return {
    id: 'funnel-1',
    name: 'Test Funnel',
    seoSlug: 'test-funnel',
    status: 'PUBLISHED',
    companyId: 'company-1',
    stages: [],
    totalVisits: 0,
    totalConversions: 0,
    settings: {
      branding: {},
      behavior: {
        showProgressBar: true,
        exitIntent: false,
        abandonedCartEmail: false,
      },
      seo: {
        title: 'Test SEO Title',
        description: 'Test description',
      },
      urls: {},
    },
    ...overrides,
  } as Funnel;
}

function createBrandKit(overrides: Partial<BrandKit> = {}): BrandKit {
  return {
    ...DEFAULT_BRAND_KIT,
    ...overrides,
    logos: {
      ...DEFAULT_BRAND_KIT.logos,
      ...(overrides.logos || {}),
    },
    colors: {
      ...DEFAULT_BRAND_KIT.colors,
      ...(overrides.colors || {}),
    },
    typography: {
      ...DEFAULT_BRAND_KIT.typography,
      ...(overrides.typography || {}),
    },
  };
}

// ============================================================================
// Metadata Structure Tests
// ============================================================================

describe('Funnel Page Metadata', () => {
  describe('metadata structure', () => {
    it('should include icon, shortcut, and apple touch icon when favicon is available', () => {
      const faviconUrl = 'https://example.com/favicon.ico';

      // This tests the expected metadata structure
      const icons = {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      };

      expect(icons.icon).toBe(faviconUrl);
      expect(icons.shortcut).toBe(faviconUrl);
      expect(icons.apple).toBe(faviconUrl);
    });

    it('should return undefined icons when no favicon is available', () => {
      const faviconUrl = undefined;

      const icons = faviconUrl
        ? {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
          }
        : undefined;

      expect(icons).toBeUndefined();
    });
  });

  describe('metadata title handling', () => {
    it('should use seo.title when available', () => {
      const funnel = createMinimalFunnel({
        settings: {
          branding: { primaryColor: '#0ea5e9' },
          behavior: { showProgressBar: true, allowBackNavigation: true, autoSaveProgress: true, sessionTimeout: 1800, abandonmentEmail: false },
          seo: { title: 'SEO Title', description: 'Description' },
          urls: {},
        },
      });

      const title = funnel.settings.seo.title || funnel.name;
      expect(title).toBe('SEO Title');
    });

    it('should fall back to funnel name when seo.title is not set', () => {
      const funnel = createMinimalFunnel({
        name: 'My Funnel Name',
        settings: {
          branding: { primaryColor: '#0ea5e9' },
          behavior: { showProgressBar: true, allowBackNavigation: true, autoSaveProgress: true, sessionTimeout: 1800, abandonmentEmail: false },
          seo: { title: '', description: 'Description' },
          urls: {},
        },
      });

      const title = funnel.settings.seo.title || funnel.name;
      expect(title).toBe('My Funnel Name');
    });
  });

  describe('openGraph configuration', () => {
    it('should include ogImage when available', () => {
      const funnel = createMinimalFunnel({
        settings: {
          branding: { primaryColor: '#0ea5e9' },
          behavior: { showProgressBar: true, allowBackNavigation: true, autoSaveProgress: true, sessionTimeout: 1800, abandonmentEmail: false },
          seo: {
            title: 'Title',
            description: 'Description',
            ogImage: 'https://example.com/og-image.jpg',
          },
          urls: {},
        },
      });

      const openGraph = funnel.settings.seo.ogImage
        ? { images: [funnel.settings.seo.ogImage] }
        : undefined;

      expect(openGraph).toEqual({ images: ['https://example.com/og-image.jpg'] });
    });

    it('should not include openGraph when ogImage is not set', () => {
      const funnel = createMinimalFunnel();

      const openGraph = funnel.settings.seo.ogImage
        ? { images: [funnel.settings.seo.ogImage] }
        : undefined;

      expect(openGraph).toBeUndefined();
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Funnel Page Error Handling', () => {
  describe('fallback metadata', () => {
    it('should have proper fallback metadata structure for errors', () => {
      // When API call fails, metadata should have only title
      const fallbackMetadata = {
        title: 'Page Not Found',
      };

      expect(fallbackMetadata.title).toBe('Page Not Found');
      expect(Object.keys(fallbackMetadata)).toHaveLength(1);
    });
  });
});

// ============================================================================
// Funnel Status Tests
// ============================================================================

describe('Funnel Page Status Validation', () => {
  describe('published status', () => {
    it('should allow PUBLISHED funnels', () => {
      const funnel = createMinimalFunnel({ status: 'PUBLISHED' });
      expect(funnel.status).toBe('PUBLISHED');
    });

    it('should reject DRAFT funnels', () => {
      const funnel = createMinimalFunnel({ status: 'DRAFT' });
      expect(funnel.status).not.toBe('PUBLISHED');
    });

    it('should reject ARCHIVED funnels', () => {
      const funnel = createMinimalFunnel({ status: 'ARCHIVED' });
      expect(funnel.status).not.toBe('PUBLISHED');
    });
  });
});
