/**
 * Unit tests for favicon utility functions
 */

import { getFaviconFromFunnel, isValidFaviconUrl } from './favicon-utils';
import { DEFAULT_BRAND_KIT } from './brand-kit-resolver';
import type { Funnel, BrandKit } from './api';

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
        title: 'Test Funnel',
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
// getFaviconFromFunnel Tests
// ============================================================================

describe('getFaviconFromFunnel', () => {
  describe('priority order', () => {
    it('should return faviconUrl when available', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: 'https://example.com/favicon.ico',
          logos: {
            iconUrl: 'https://example.com/icon.png',
            fullUrl: 'https://example.com/logo.png',
          },
        }),
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://example.com/favicon.ico');
    });

    it('should fall back to iconUrl when faviconUrl is not available', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: undefined,
          logos: {
            iconUrl: 'https://example.com/icon.png',
            fullUrl: 'https://example.com/logo.png',
          },
        }),
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://example.com/icon.png');
    });

    it('should fall back to fullUrl when faviconUrl and iconUrl are not available', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: undefined,
          logos: {
            iconUrl: undefined,
            fullUrl: 'https://example.com/logo.png',
          },
        }),
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://example.com/logo.png');
    });

    it('should return undefined when no favicon or logos are available', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: undefined,
          logos: {},
        }),
      });

      expect(getFaviconFromFunnel(funnel)).toBeUndefined();
    });
  });

  describe('brand kit resolution', () => {
    it('should use funnel brandKit over company brandKit for favicon', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: 'https://funnel.com/favicon.ico',
        }),
        company: {
          id: 'company-1',
          name: 'Test Company',
          code: 'TEST',
          settings: {
            brandKit: createBrandKit({
              faviconUrl: 'https://company.com/favicon.ico',
            }),
          },
        },
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://funnel.com/favicon.ico');
    });

    it('should use company brandKit when funnel brandKit has no favicon', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: undefined,
          logos: {},
        }),
        company: {
          id: 'company-1',
          name: 'Test Company',
          code: 'TEST',
          settings: {
            brandKit: createBrandKit({
              faviconUrl: 'https://company.com/favicon.ico',
            }),
          },
        },
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://company.com/favicon.ico');
    });

    it('should use company logo as fallback when no favicon is set', () => {
      const funnel = createMinimalFunnel({
        brandKit: undefined,
        company: {
          id: 'company-1',
          name: 'Test Company',
          code: 'TEST',
          settings: {
            brandKit: createBrandKit({
              faviconUrl: undefined,
              logos: {
                iconUrl: 'https://company.com/icon.png',
              },
            }),
          },
        },
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://company.com/icon.png');
    });
  });

  describe('edge cases', () => {
    it('should handle funnel with no brandKit', () => {
      const funnel = createMinimalFunnel({
        brandKit: undefined,
        company: undefined,
      });

      expect(getFaviconFromFunnel(funnel)).toBeUndefined();
    });

    it('should handle funnel with null brandKit', () => {
      const funnel = createMinimalFunnel({
        brandKit: null as unknown as BrandKit,
        company: undefined,
      });

      expect(getFaviconFromFunnel(funnel)).toBeUndefined();
    });

    it('should handle empty string favicon URL by falling back', () => {
      const funnel = createMinimalFunnel({
        brandKit: createBrandKit({
          faviconUrl: '',
          logos: {
            iconUrl: 'https://example.com/icon.png',
          },
        }),
      });

      // Empty string is falsy, should fall back to iconUrl
      expect(getFaviconFromFunnel(funnel)).toBe('https://example.com/icon.png');
    });

    it('should handle funnel without company', () => {
      const funnel = createMinimalFunnel({
        company: undefined,
        brandKit: createBrandKit({
          faviconUrl: 'https://example.com/favicon.ico',
        }),
      });

      expect(getFaviconFromFunnel(funnel)).toBe('https://example.com/favicon.ico');
    });

    it('should handle company without brandKit', () => {
      const funnel = createMinimalFunnel({
        brandKit: undefined,
        company: {
          id: 'company-1',
          name: 'Test Company',
          code: 'TEST',
          settings: {
            brandKit: undefined,
          },
        },
      });

      expect(getFaviconFromFunnel(funnel)).toBeUndefined();
    });
  });
});

// ============================================================================
// isValidFaviconUrl Tests
// ============================================================================

describe('isValidFaviconUrl', () => {
  describe('valid URLs', () => {
    it('should accept absolute https URLs', () => {
      expect(isValidFaviconUrl('https://example.com/favicon.ico')).toBe(true);
    });

    it('should accept absolute http URLs', () => {
      expect(isValidFaviconUrl('http://example.com/favicon.ico')).toBe(true);
    });

    it('should accept relative URLs starting with /', () => {
      expect(isValidFaviconUrl('/favicon.ico')).toBe(true);
    });

    it('should accept data URLs', () => {
      expect(isValidFaviconUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    it('should reject undefined', () => {
      expect(isValidFaviconUrl(undefined)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidFaviconUrl('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidFaviconUrl(null as unknown as string)).toBe(false);
      expect(isValidFaviconUrl(123 as unknown as string)).toBe(false);
      expect(isValidFaviconUrl({} as unknown as string)).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidFaviconUrl('not a url')).toBe(false);
      expect(isValidFaviconUrl('://missing-protocol')).toBe(false);
    });
  });
});
