/**
 * Unit tests for BrandProvider context
 *
 * Tests the BrandProvider component and useBrand hook for:
 * 1. Rendering children correctly
 * 2. Providing resolved brand kit values
 * 3. Throwing errors when used outside provider
 * 4. Correct logo URL resolution
 * 5. Correct CSS variables generation
 * 6. Memoization behavior
 * 7. Fallback resolution (funnel -> company -> legacy -> defaults)
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { BrandProvider, useBrand } from './brand-context';
import type { Funnel, BrandKit } from '@/lib/api';
import { DEFAULT_BRAND_KIT } from '@/lib/brand-kit-resolver';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMinimalFunnel = (overrides: Partial<Funnel> = {}): Funnel => ({
  id: 'funnel-1',
  companyId: 'company-1',
  name: 'Test Funnel',
  slug: 'test-funnel',
  type: 'FULL_FUNNEL',
  status: 'PUBLISHED',
  settings: {
    branding: {
      primaryColor: '#000000',
    },
    urls: {},
    behavior: {
      allowBackNavigation: true,
      showProgressBar: true,
      autoSaveProgress: true,
      sessionTimeout: 3600,
      abandonmentEmail: false,
    },
    seo: {},
  },
  stages: [],
  totalVisits: 0,
  totalConversions: 0,
  ...overrides,
});

const createFunnelWithBrandKit = (brandKit: Partial<BrandKit>): Funnel => ({
  ...createMinimalFunnel(),
  brandKit: {
    logos: brandKit.logos || {},
    colors: {
      primary: '#6366f1',
      ...brandKit.colors,
    },
    typography: brandKit.typography || {},
    faviconUrl: brandKit.faviconUrl,
    preset: brandKit.preset,
  },
});

const createFunnelWithCompanyBrandKit = (companyBrandKit: Partial<BrandKit>): Funnel => ({
  ...createMinimalFunnel(),
  company: {
    id: 'company-1',
    name: 'Test Company',
    code: 'TEST',
    settings: {
      brandKit: {
        logos: companyBrandKit.logos || {},
        colors: {
          primary: '#company-primary',
          ...companyBrandKit.colors,
        },
        typography: companyBrandKit.typography || {},
        faviconUrl: companyBrandKit.faviconUrl,
        preset: companyBrandKit.preset,
      },
    },
  },
});

const createFunnelWithLegacyBranding = (): Funnel => ({
  ...createMinimalFunnel(),
  settings: {
    branding: {
      primaryColor: '#legacy-primary',
      secondaryColor: '#legacy-secondary',
      fontFamily: 'Legacy Font',
      logoUrl: 'https://legacy.example.com/logo.png',
    },
    urls: {},
    behavior: {
      allowBackNavigation: true,
      showProgressBar: true,
      autoSaveProgress: true,
      sessionTimeout: 3600,
      abandonmentEmail: false,
    },
    seo: {},
  },
  stages: [],
});

// ============================================================================
// Test: BrandProvider Renders Children
// ============================================================================

describe('BrandProvider', () => {
  describe('rendering children', () => {
    it('should render children correctly', () => {
      const funnel = createMinimalFunnel();

      render(
        <BrandProvider funnel={funnel}>
          <div data-testid="child">Child Content</div>
        </BrandProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should wrap children in a div with brand-provider class', () => {
      const funnel = createMinimalFunnel();

      const { container } = render(
        <BrandProvider funnel={funnel}>
          <span>Test</span>
        </BrandProvider>
      );

      const wrapper = container.querySelector('.brand-provider');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const funnel = createMinimalFunnel();

      render(
        <BrandProvider funnel={funnel}>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
          <div data-testid="child-3">Third</div>
        </BrandProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const funnel = createMinimalFunnel();

      const NestedComponent = () => <span data-testid="nested">Nested</span>;

      render(
        <BrandProvider funnel={funnel}>
          <div>
            <NestedComponent />
          </div>
        </BrandProvider>
      );

      expect(screen.getByTestId('nested')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Test: useBrand Returns Resolved Brand Kit
// ============================================================================

describe('useBrand', () => {
  describe('returns resolved brand kit', () => {
    it('should return the resolved brand kit from context', () => {
      const funnel = createFunnelWithBrandKit({
        colors: {
          primary: '#custom-primary',
          secondary: '#custom-secondary',
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BrandProvider funnel={funnel}>{children}</BrandProvider>
      );

      const { result } = renderHook(() => useBrand(), { wrapper });

      expect(result.current.brandKit).toBeDefined();
      expect(result.current.brandKit.colors.primary).toBe('#custom-primary');
      expect(result.current.brandKit.colors.secondary).toBe('#custom-secondary');
    });

    it('should return default brand kit when funnel has no branding', () => {
      const funnel = createMinimalFunnel({
        brandKit: undefined,
        settings: {
          branding: {
            primaryColor: '',
          },
          urls: {},
          behavior: {
            allowBackNavigation: true,
            showProgressBar: true,
            autoSaveProgress: true,
            sessionTimeout: 3600,
            abandonmentEmail: false,
          },
          seo: {},
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BrandProvider funnel={funnel}>{children}</BrandProvider>
      );

      const { result } = renderHook(() => useBrand(), { wrapper });

      // Should have default primary color
      expect(result.current.brandKit.colors.primary).toBe(DEFAULT_BRAND_KIT.colors.primary);
    });

    it('should include all brand kit properties', () => {
      const funnel = createFunnelWithBrandKit({
        logos: {
          fullUrl: 'https://example.com/logo.png',
          iconUrl: 'https://example.com/icon.png',
        },
        colors: {
          primary: '#primary',
          secondary: '#secondary',
          accent: '#accent',
        },
        typography: {
          headingFont: 'Custom Heading',
          bodyFont: 'Custom Body',
        },
        faviconUrl: 'https://example.com/favicon.ico',
        preset: 'bold',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BrandProvider funnel={funnel}>{children}</BrandProvider>
      );

      const { result } = renderHook(() => useBrand(), { wrapper });

      expect(result.current.brandKit.logos.fullUrl).toBe('https://example.com/logo.png');
      expect(result.current.brandKit.logos.iconUrl).toBe('https://example.com/icon.png');
      expect(result.current.brandKit.colors.primary).toBe('#primary');
      expect(result.current.brandKit.colors.secondary).toBe('#secondary');
      expect(result.current.brandKit.colors.accent).toBe('#accent');
      expect(result.current.brandKit.typography.headingFont).toBe('Custom Heading');
      expect(result.current.brandKit.typography.bodyFont).toBe('Custom Body');
      expect(result.current.brandKit.faviconUrl).toBe('https://example.com/favicon.ico');
      expect(result.current.brandKit.preset).toBe('bold');
    });
  });
});

// ============================================================================
// Test: useBrand Throws Error Outside Provider
// ============================================================================

describe('useBrand throws error outside provider', () => {
  // Suppress console.error for this test
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should throw error when used outside BrandProvider', () => {
    expect(() => {
      renderHook(() => useBrand());
    }).toThrow('useBrand must be used within a BrandProvider');
  });

  it('should throw with correct error message', () => {
    try {
      renderHook(() => useBrand());
      fail('Expected error to be thrown');
    } catch (error) {
      expect((error as Error).message).toBe('useBrand must be used within a BrandProvider');
    }
  });
});

// ============================================================================
// Test: Provides Correct Logo URLs
// ============================================================================

describe('useBrand provides correct logo URLs', () => {
  it('should provide logoUrl (full logo)', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        fullUrl: 'https://example.com/full-logo.png',
        iconUrl: 'https://example.com/icon.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.logoUrl).toBe('https://example.com/full-logo.png');
  });

  it('should fall back to iconUrl when fullUrl is missing for logoUrl', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        iconUrl: 'https://example.com/icon.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.logoUrl).toBe('https://example.com/icon.png');
  });

  it('should provide iconLogoUrl', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        fullUrl: 'https://example.com/full.png',
        iconUrl: 'https://example.com/icon.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.iconLogoUrl).toBe('https://example.com/icon.png');
  });

  it('should fall back to fullUrl when iconUrl is missing for iconLogoUrl', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        fullUrl: 'https://example.com/full.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.iconLogoUrl).toBe('https://example.com/full.png');
  });

  it('should provide monochromeLogoUrl', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        fullUrl: 'https://example.com/full.png',
        monochromeUrl: 'https://example.com/mono.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.monochromeLogoUrl).toBe('https://example.com/mono.png');
  });

  it('should provide reversedLogoUrl', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        fullUrl: 'https://example.com/full.png',
        reversedUrl: 'https://example.com/reversed.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.reversedLogoUrl).toBe('https://example.com/reversed.png');
  });

  it('should provide faviconUrl', () => {
    const funnel = createFunnelWithBrandKit({
      faviconUrl: 'https://example.com/favicon.ico',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.faviconUrl).toBe('https://example.com/favicon.ico');
  });

  it('should return undefined when no logos are available', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {},
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.logoUrl).toBeUndefined();
    expect(result.current.iconLogoUrl).toBeUndefined();
    expect(result.current.monochromeLogoUrl).toBeUndefined();
    expect(result.current.reversedLogoUrl).toBeUndefined();
  });
});

// ============================================================================
// Test: Provides Correct CSS Variables
// ============================================================================

describe('useBrand provides correct CSS variables', () => {
  it('should provide CSS variables for colors', () => {
    const funnel = createFunnelWithBrandKit({
      colors: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        background: '#ffffff',
        text: '#000000',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.cssVariables['--brand-primary']).toBe('#ff0000');
    expect(result.current.cssVariables['--brand-secondary']).toBe('#00ff00');
    expect(result.current.cssVariables['--brand-accent']).toBe('#0000ff');
    expect(result.current.cssVariables['--brand-background']).toBe('#ffffff');
    expect(result.current.cssVariables['--brand-text']).toBe('#000000');
  });

  it('should provide CSS variables for typography', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Roboto',
        bodyFont: 'Open Sans',
        baseFontSize: 18,
        headingScale: 1.5,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.cssVariables['--brand-font-heading']).toBe('Roboto');
    expect(result.current.cssVariables['--brand-font-body']).toBe('Open Sans');
    expect(result.current.cssVariables['--brand-font-size-base']).toBe('18px');
    expect(result.current.cssVariables['--brand-heading-scale']).toBe('1.5');
  });

  it('should apply CSS variables to wrapper div style', () => {
    const funnel = createFunnelWithBrandKit({
      colors: {
        primary: '#test-primary',
      },
    });

    const { container } = render(
      <BrandProvider funnel={funnel}>
        <span>Test</span>
      </BrandProvider>
    );

    const wrapper = container.querySelector('.brand-provider');
    expect(wrapper).toHaveStyle({ '--brand-primary': '#test-primary' });
  });
});

// ============================================================================
// Test: Memoization Behavior
// ============================================================================

describe('useBrand memoization', () => {
  it('should return same object reference when funnel does not change', () => {
    const funnel = createFunnelWithBrandKit({
      colors: { primary: '#test' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result, rerender } = renderHook(() => useBrand(), { wrapper });

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    // Same funnel object = same context value reference
    expect(firstResult).toBe(secondResult);
  });

  it('should return new object reference when funnel changes', () => {
    let funnel = createFunnelWithBrandKit({
      colors: { primary: '#first' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result, rerender } = renderHook(() => useBrand(), { wrapper });

    const firstBrandKit = result.current.brandKit;
    expect(firstBrandKit.colors.primary).toBe('#first');

    // Update funnel
    funnel = createFunnelWithBrandKit({
      colors: { primary: '#second' },
    });

    rerender();

    const secondBrandKit = result.current.brandKit;
    expect(secondBrandKit.colors.primary).toBe('#second');
    expect(firstBrandKit).not.toBe(secondBrandKit);
  });

  it('should memoize cssVariables correctly', () => {
    const funnel = createFunnelWithBrandKit({
      colors: { primary: '#test' },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result, rerender } = renderHook(() => useBrand(), { wrapper });

    const firstCssVars = result.current.cssVariables;
    rerender();
    const secondCssVars = result.current.cssVariables;

    expect(firstCssVars).toBe(secondCssVars);
  });

  it('should memoize logo URLs correctly', () => {
    const funnel = createFunnelWithBrandKit({
      logos: {
        fullUrl: 'https://example.com/logo.png',
        iconUrl: 'https://example.com/icon.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result, rerender } = renderHook(() => useBrand(), { wrapper });

    const firstLogoUrl = result.current.logoUrl;
    const firstIconUrl = result.current.iconLogoUrl;
    rerender();
    const secondLogoUrl = result.current.logoUrl;
    const secondIconUrl = result.current.iconLogoUrl;

    expect(firstLogoUrl).toBe(secondLogoUrl);
    expect(firstIconUrl).toBe(secondIconUrl);
  });
});

// ============================================================================
// Test: Resolves Funnel BrandKit with Company Fallback
// ============================================================================

describe('useBrand resolves funnel brandKit with company fallback', () => {
  it('should use funnel brandKit over company brandKit', () => {
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      brandKit: {
        logos: {},
        colors: {
          primary: '#funnel-primary',
        },
        typography: {},
      },
      company: {
        id: 'company-1',
        name: 'Test Company',
        code: 'TEST',
        settings: {
          brandKit: {
            logos: {},
            colors: {
              primary: '#company-primary',
            },
            typography: {},
          },
        },
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.colors.primary).toBe('#funnel-primary');
  });

  it('should fall back to company brandKit when funnel has none', () => {
    const funnel = createFunnelWithCompanyBrandKit({
      colors: {
        primary: '#company-primary',
        secondary: '#company-secondary',
      },
      logos: {
        fullUrl: 'https://company.example.com/logo.png',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.colors.primary).toBe('#company-primary');
    expect(result.current.brandKit.colors.secondary).toBe('#company-secondary');
    expect(result.current.brandKit.logos.fullUrl).toBe('https://company.example.com/logo.png');
  });

  it('should merge funnel and company brandKit (funnel overrides company)', () => {
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      brandKit: {
        logos: {},
        colors: {
          primary: '#funnel-primary',
          // Secondary not specified in funnel
        },
        typography: {},
      },
      company: {
        id: 'company-1',
        name: 'Test Company',
        code: 'TEST',
        settings: {
          brandKit: {
            logos: {
              fullUrl: 'https://company.example.com/logo.png',
            },
            colors: {
              primary: '#company-primary',
              secondary: '#company-secondary',
              accent: '#company-accent',
            },
            typography: {
              headingFont: 'Company Font',
            },
          },
        },
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    // Funnel overrides
    expect(result.current.brandKit.colors.primary).toBe('#funnel-primary');
    // Company fallback
    expect(result.current.brandKit.colors.secondary).toBe('#company-secondary');
    expect(result.current.brandKit.colors.accent).toBe('#company-accent');
    expect(result.current.brandKit.logos.fullUrl).toBe('https://company.example.com/logo.png');
    expect(result.current.brandKit.typography.headingFont).toBe('Company Font');
  });

  it('should use default brandKit when neither funnel nor company has brandKit', () => {
    // Override settings to remove legacy branding
    const funnel: Funnel = {
      id: 'funnel-1',
      companyId: 'company-1',
      name: 'Test Funnel',
      slug: 'test-funnel',
      type: 'FULL_FUNNEL',
      status: 'PUBLISHED',
      settings: {
        branding: {}, // No legacy branding
        urls: {},
        behavior: {
          allowBackNavigation: true,
          showProgressBar: true,
          autoSaveProgress: true,
          sessionTimeout: 3600,
          abandonmentEmail: false,
        },
        seo: {},
      },
      brandKit: undefined,
      company: {
        id: 'company-1',
        name: 'Test Company',
        code: 'TEST',
        settings: {},
      },
      stages: [],
      totalVisits: 0,
      totalConversions: 0,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.colors.primary).toBe(DEFAULT_BRAND_KIT.colors.primary);
  });
});

// ============================================================================
// Test: Resolves Legacy Branding Settings
// ============================================================================

describe('useBrand resolves legacy branding settings', () => {
  it('should resolve legacy primaryColor', () => {
    const funnel = createFunnelWithLegacyBranding();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.colors.primary).toBe('#legacy-primary');
  });

  it('should resolve legacy secondaryColor', () => {
    const funnel = createFunnelWithLegacyBranding();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.colors.secondary).toBe('#legacy-secondary');
  });

  it('should resolve legacy fontFamily to heading and body fonts', () => {
    const funnel = createFunnelWithLegacyBranding();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.typography.headingFont).toBe('Legacy Font');
    expect(result.current.brandKit.typography.bodyFont).toBe('Legacy Font');
  });

  it('should resolve legacy logoUrl to fullUrl', () => {
    const funnel = createFunnelWithLegacyBranding();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit.logos.fullUrl).toBe('https://legacy.example.com/logo.png');
    expect(result.current.logoUrl).toBe('https://legacy.example.com/logo.png');
  });

  it('should apply priority: funnel brandKit > company > legacy > defaults', () => {
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      settings: {
        branding: {
          primaryColor: '#legacy-primary',
          secondaryColor: '#legacy-secondary',
          fontFamily: 'Legacy Font',
          logoUrl: 'https://legacy.example.com/logo.png',
        },
        urls: {},
        behavior: {
          allowBackNavigation: true,
          showProgressBar: true,
          autoSaveProgress: true,
          sessionTimeout: 3600,
          abandonmentEmail: false,
        },
        seo: {},
      },
      brandKit: {
        logos: {},
        colors: {
          primary: '#funnel-primary',
        },
        typography: {},
      },
      company: {
        id: 'company-1',
        name: 'Test Company',
        code: 'TEST',
        settings: {
          brandKit: {
            logos: {},
            colors: {
              primary: '#company-primary',
              secondary: '#company-secondary',
            },
            typography: {
              headingFont: 'Company Font',
            },
          },
        },
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    // Funnel wins for primary
    expect(result.current.brandKit.colors.primary).toBe('#funnel-primary');
    // Company wins for secondary (funnel doesn't override)
    expect(result.current.brandKit.colors.secondary).toBe('#company-secondary');
    // Company wins for heading font
    expect(result.current.brandKit.typography.headingFont).toBe('Company Font');
    // Legacy wins for logo (company/funnel don't override)
    expect(result.current.brandKit.logos.fullUrl).toBe('https://legacy.example.com/logo.png');
    // Default wins for accent (nothing overrides)
    expect(result.current.brandKit.colors.accent).toBe(DEFAULT_BRAND_KIT.colors.accent);
  });
});

// ============================================================================
// Test: Google Fonts URL
// ============================================================================

describe('useBrand provides correct googleFontsUrl', () => {
  it('should return Google Fonts URL for custom heading and body fonts', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Roboto',
        bodyFont: 'Open Sans',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.googleFontsUrl).not.toBeNull();
    expect(result.current.googleFontsUrl).toContain('fonts.googleapis.com');
    expect(result.current.googleFontsUrl).toContain('Roboto');
    // encodeURIComponent uses %20 for spaces
    expect(result.current.googleFontsUrl).toContain('Open%20Sans');
  });

  it('should return Google Fonts URL for single custom font', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Playfair Display',
        bodyFont: 'Arial', // System font
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.googleFontsUrl).not.toBeNull();
    // encodeURIComponent uses %20 for spaces
    expect(result.current.googleFontsUrl).toContain('Playfair%20Display');
    // Arial is a system font, should not be in the URL
    expect(result.current.googleFontsUrl).not.toContain('Arial');
  });

  it('should return null for system fonts only', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Arial',
        bodyFont: 'Helvetica',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.googleFontsUrl).toBeNull();
  });

  it('should return null when fonts are system-ui', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'system-ui',
        bodyFont: 'sans-serif',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.googleFontsUrl).toBeNull();
  });

  it('should include custom fonts from customFonts array', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Arial',
        bodyFont: 'Helvetica',
        customFonts: ['Poppins', 'Lato'],
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.googleFontsUrl).not.toBeNull();
    expect(result.current.googleFontsUrl).toContain('Poppins');
    expect(result.current.googleFontsUrl).toContain('Lato');
  });

  it('should deduplicate fonts when heading and body are the same', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.googleFontsUrl).not.toBeNull();
    // Should only have one occurrence of Inter
    const interMatches = result.current.googleFontsUrl?.match(/Inter/g);
    expect(interMatches).toHaveLength(1);
  });
});

// ============================================================================
// Test: Font Styles
// ============================================================================

describe('useBrand provides correct fontStyles', () => {
  it('should provide fontStyles.heading with correct font-family', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Roboto',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.fontStyles.heading).toBeDefined();
    expect(result.current.fontStyles.heading.fontFamily).toBe('"Roboto", sans-serif');
  });

  it('should provide fontStyles.body with correct font-family', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        bodyFont: 'Open Sans',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.fontStyles.body).toBeDefined();
    expect(result.current.fontStyles.body.fontFamily).toBe('"Open Sans", sans-serif');
  });

  it('should provide different fonts for heading and body', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Playfair Display',
        bodyFont: 'Lato',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.fontStyles.heading.fontFamily).toBe('"Playfair Display", sans-serif');
    expect(result.current.fontStyles.body.fontFamily).toBe('"Lato", sans-serif');
  });

  it('should use inherit when headingFont is undefined', () => {
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      brandKit: {
        logos: {},
        colors: { primary: '#000' },
        typography: {
          headingFont: undefined,
          bodyFont: 'Open Sans',
        },
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    // headingFont should fall back to default (Inter), not undefined
    // Since Inter is in DEFAULT_BRAND_KIT, it should be set
    expect(result.current.fontStyles.heading.fontFamily).toBe('"Inter", sans-serif');
  });

  it('should use inherit when bodyFont is undefined', () => {
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      brandKit: {
        logos: {},
        colors: { primary: '#000' },
        typography: {
          headingFont: 'Roboto',
          bodyFont: undefined,
        },
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    // bodyFont should fall back to default (Inter), not undefined
    expect(result.current.fontStyles.body.fontFamily).toBe('"Inter", sans-serif');
  });

  it('should use inherit for both fonts when typography is empty', () => {
    // Create a funnel where we explicitly set both fonts to empty strings
    // to test the "inherit" fallback behavior
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      brandKit: {
        logos: {},
        colors: { primary: '#000' },
        typography: {
          headingFont: '',
          bodyFont: '',
        },
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    // Empty strings are falsy, so fontFamily should be 'inherit'
    expect(result.current.fontStyles.heading.fontFamily).toBe('inherit');
    expect(result.current.fontStyles.body.fontFamily).toBe('inherit');
  });

  it('should memoize fontStyles correctly', () => {
    const funnel = createFunnelWithBrandKit({
      typography: {
        headingFont: 'Roboto',
        bodyFont: 'Open Sans',
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result, rerender } = renderHook(() => useBrand(), { wrapper });

    const firstFontStyles = result.current.fontStyles;
    rerender();
    const secondFontStyles = result.current.fontStyles;

    expect(firstFontStyles).toBe(secondFontStyles);
  });
});

// ============================================================================
// Additional Edge Cases
// ============================================================================

describe('BrandProvider edge cases', () => {
  it('should handle funnel with no settings', () => {
    const funnel: Funnel = {
      id: 'funnel-1',
      companyId: 'company-1',
      name: 'Test Funnel',
      slug: 'test-funnel',
      type: 'FULL_FUNNEL',
      status: 'PUBLISHED',
      settings: undefined as unknown as Funnel['settings'],
      stages: [],
      totalVisits: 0,
      totalConversions: 0,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    // When settings is undefined, brandKit should still be defined with defaults
    expect(result.current.brandKit).toBeDefined();
    // The resolver should provide default primary color
    expect(result.current.brandKit.colors).toBeDefined();
    expect(result.current.brandKit.colors.primary).toBe(DEFAULT_BRAND_KIT.colors.primary);
  });

  it('should handle company with undefined settings', () => {
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      company: {
        id: 'company-1',
        name: 'Test Company',
        code: 'TEST',
        settings: undefined,
      },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit).toBeDefined();
  });

  it('should handle null brandKit values', () => {
    // When brandKit is null but legacy branding exists, legacy branding takes precedence
    const funnel: Funnel = {
      ...createMinimalFunnel(),
      brandKit: null as unknown as BrandKit,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit).toBeDefined();
    // createMinimalFunnel has legacy branding with primaryColor: '#000000'
    expect(result.current.brandKit.colors.primary).toBe('#000000');
  });

  it('should use DEFAULT_BRAND_KIT when brandKit is null and no legacy branding exists', () => {
    const funnel: Funnel = {
      id: 'funnel-1',
      companyId: 'company-1',
      name: 'Test Funnel',
      slug: 'test-funnel',
      type: 'FULL_FUNNEL',
      status: 'PUBLISHED',
      settings: {
        branding: {}, // No legacy branding colors
        urls: {},
        behavior: {
          allowBackNavigation: true,
          showProgressBar: true,
          autoSaveProgress: true,
          sessionTimeout: 3600,
          abandonmentEmail: false,
        },
        seo: {},
      },
      brandKit: null as unknown as BrandKit,
      stages: [],
      totalVisits: 0,
      totalConversions: 0,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrandProvider funnel={funnel}>{children}</BrandProvider>
    );

    const { result } = renderHook(() => useBrand(), { wrapper });

    expect(result.current.brandKit).toBeDefined();
    expect(result.current.brandKit.colors.primary).toBe(DEFAULT_BRAND_KIT.colors.primary);
  });
});
