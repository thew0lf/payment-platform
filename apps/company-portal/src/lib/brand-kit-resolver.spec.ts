/**
 * Unit tests for brand-kit-resolver.ts
 */

import {
  resolveBrandKit,
  mergeBrandKit,
  getBrandKitCSSVariables,
  getGoogleFontsUrl,
  getLogoUrl,
  DEFAULT_BRAND_KIT,
  BrandKit,
  BrandKitLogo,
  BrandKitOverride,
  FunnelWithBrandKit,
} from './brand-kit-resolver';

// ============================================================================
// resolveBrandKit Tests
// ============================================================================

describe('resolveBrandKit', () => {
  describe('default behavior', () => {
    it('should return default brand kit when funnel has no branding', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
      };

      const result = resolveBrandKit(funnel);

      expect(result).toEqual(DEFAULT_BRAND_KIT);
    });

    it('should return default brand kit when funnel has null brandKit', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: null,
      };

      const result = resolveBrandKit(funnel);

      expect(result).toEqual(DEFAULT_BRAND_KIT);
    });

    it('should return default brand kit when funnel has empty brandKit', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: {},
      };

      const result = resolveBrandKit(funnel);

      expect(result).toEqual(DEFAULT_BRAND_KIT);
    });

    it('should return default brand kit when funnel has null settings', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: null,
      };

      const result = resolveBrandKit(funnel);

      expect(result).toEqual(DEFAULT_BRAND_KIT);
    });
  });

  describe('legacy branding settings', () => {
    it('should apply legacy primaryColor', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#ff0000',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.colors.primary).toBe('#ff0000');
      // Other colors should remain default
      expect(result.colors.secondary).toBe(DEFAULT_BRAND_KIT.colors.secondary);
    });

    it('should apply legacy secondaryColor', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            secondaryColor: '#00ff00',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.colors.secondary).toBe('#00ff00');
      expect(result.colors.primary).toBe(DEFAULT_BRAND_KIT.colors.primary);
    });

    it('should apply legacy fontFamily to both heading and body fonts', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            fontFamily: 'Roboto',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.typography.headingFont).toBe('Roboto');
      expect(result.typography.bodyFont).toBe('Roboto');
    });

    it('should apply legacy logoUrl to fullUrl', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            logoUrl: 'https://example.com/logo.png',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.logos.fullUrl).toBe('https://example.com/logo.png');
    });

    it('should apply all legacy branding settings together', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#ff0000',
            secondaryColor: '#00ff00',
            fontFamily: 'Roboto',
            logoUrl: 'https://example.com/logo.png',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.colors.primary).toBe('#ff0000');
      expect(result.colors.secondary).toBe('#00ff00');
      expect(result.typography.headingFont).toBe('Roboto');
      expect(result.typography.bodyFont).toBe('Roboto');
      expect(result.logos.fullUrl).toBe('https://example.com/logo.png');
    });
  });

  describe('company brand kit fallback', () => {
    it('should apply company brand kit as fallback', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
      };
      const companyBrandKit: BrandKitOverride = {
        colors: {
          primary: '#company-primary',
        },
        logos: {
          fullUrl: 'https://company.com/logo.png',
        },
      };

      const result = resolveBrandKit(funnel, companyBrandKit);

      expect(result.colors.primary).toBe('#company-primary');
      expect(result.logos.fullUrl).toBe('https://company.com/logo.png');
    });

    it('should apply company brand kit over legacy branding', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#legacy-color',
          },
        },
      };
      const companyBrandKit: BrandKitOverride = {
        colors: {
          primary: '#company-color',
        },
      };

      const result = resolveBrandKit(funnel, companyBrandKit);

      expect(result.colors.primary).toBe('#company-color');
    });

    it('should handle null company brand kit', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
      };

      const result = resolveBrandKit(funnel, null);

      expect(result).toEqual(DEFAULT_BRAND_KIT);
    });
  });

  describe('funnel brand kit with highest priority', () => {
    it('should apply funnel brand kit over defaults', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: {
          colors: {
            primary: '#funnel-primary',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.colors.primary).toBe('#funnel-primary');
    });

    it('should apply funnel brand kit over company brand kit', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: {
          colors: {
            primary: '#funnel-color',
          },
        },
      };
      const companyBrandKit: BrandKitOverride = {
        colors: {
          primary: '#company-color',
        },
      };

      const result = resolveBrandKit(funnel, companyBrandKit);

      expect(result.colors.primary).toBe('#funnel-color');
    });

    it('should apply funnel brand kit over legacy branding', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#legacy-color',
          },
        },
        brandKit: {
          colors: {
            primary: '#funnel-color',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.colors.primary).toBe('#funnel-color');
    });

    it('should apply funnel brand kit over both company and legacy', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#legacy-color',
            fontFamily: 'Legacy Font',
          },
        },
        brandKit: {
          colors: {
            primary: '#funnel-color',
          },
        },
      };
      const companyBrandKit: BrandKitOverride = {
        colors: {
          primary: '#company-color',
          secondary: '#company-secondary',
        },
        typography: {
          headingFont: 'Company Font',
        },
      };

      const result = resolveBrandKit(funnel, companyBrandKit);

      // Funnel wins for primary
      expect(result.colors.primary).toBe('#funnel-color');
      // Company wins for secondary (funnel doesn't override)
      expect(result.colors.secondary).toBe('#company-secondary');
      // Company wins for heading font (funnel doesn't override)
      expect(result.typography.headingFont).toBe('Company Font');
    });
  });

  describe('partial overrides and deep merging', () => {
    it('should properly merge partial color overrides', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: {
          colors: {
            primary: '#custom-primary',
            // secondary, accent, etc. not provided
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.colors.primary).toBe('#custom-primary');
      expect(result.colors.secondary).toBe(DEFAULT_BRAND_KIT.colors.secondary);
      expect(result.colors.accent).toBe(DEFAULT_BRAND_KIT.colors.accent);
      expect(result.colors.background).toBe(DEFAULT_BRAND_KIT.colors.background);
    });

    it('should properly merge partial typography overrides', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: {
          typography: {
            headingFont: 'Custom Heading',
            // bodyFont, baseFontSize not provided
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.typography.headingFont).toBe('Custom Heading');
      expect(result.typography.bodyFont).toBe(DEFAULT_BRAND_KIT.typography.bodyFont);
      expect(result.typography.baseFontSize).toBe(DEFAULT_BRAND_KIT.typography.baseFontSize);
    });

    it('should properly merge partial logo overrides', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        brandKit: {
          logos: {
            iconUrl: 'https://example.com/icon.png',
          },
        },
      };

      const result = resolveBrandKit(funnel);

      expect(result.logos.iconUrl).toBe('https://example.com/icon.png');
      expect(result.logos.fullUrl).toBeUndefined();
    });

    it('should not replace entire objects with partial overrides', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#legacy-primary',
          },
        },
        brandKit: {
          colors: {
            primary: '#funnel-primary',
          },
        },
      };
      const companyBrandKit: BrandKitOverride = {
        colors: {
          secondary: '#company-secondary',
          accent: '#company-accent',
        },
      };

      const result = resolveBrandKit(funnel, companyBrandKit);

      // All colors should be present from different sources
      expect(result.colors.primary).toBe('#funnel-primary');
      expect(result.colors.secondary).toBe('#company-secondary');
      expect(result.colors.accent).toBe('#company-accent');
      expect(result.colors.background).toBe(DEFAULT_BRAND_KIT.colors.background);
    });
  });

  describe('priority order verification', () => {
    it('should follow priority: funnel > company > legacy > defaults', () => {
      const funnel: FunnelWithBrandKit = {
        id: 'funnel-1',
        settings: {
          branding: {
            primaryColor: '#legacy',
            secondaryColor: '#legacy',
            fontFamily: 'Legacy Font',
            logoUrl: 'https://legacy.com/logo.png',
          },
        },
        brandKit: {
          colors: {
            primary: '#funnel',
          },
          typography: {
            headingFont: 'Funnel Font',
          },
        },
      };
      const companyBrandKit: BrandKitOverride = {
        colors: {
          secondary: '#company',
        },
        typography: {
          bodyFont: 'Company Body Font',
        },
        logos: {
          iconUrl: 'https://company.com/icon.png',
        },
      };

      const result = resolveBrandKit(funnel, companyBrandKit);

      // Funnel level
      expect(result.colors.primary).toBe('#funnel');
      expect(result.typography.headingFont).toBe('Funnel Font');

      // Company level (funnel didn't override)
      expect(result.colors.secondary).toBe('#company');
      expect(result.typography.bodyFont).toBe('Company Body Font');
      expect(result.logos.iconUrl).toBe('https://company.com/icon.png');

      // Legacy level (company and funnel didn't override)
      expect(result.logos.fullUrl).toBe('https://legacy.com/logo.png');

      // Default level (nothing overrode)
      expect(result.colors.accent).toBe(DEFAULT_BRAND_KIT.colors.accent);
      expect(result.typography.baseFontSize).toBe(DEFAULT_BRAND_KIT.typography.baseFontSize);
    });
  });
});

// ============================================================================
// mergeBrandKit Tests
// ============================================================================

describe('mergeBrandKit', () => {
  describe('null/undefined override handling', () => {
    it('should return base when override is null', () => {
      const base = { ...DEFAULT_BRAND_KIT };

      const result = mergeBrandKit(base, null);

      expect(result).toEqual(base);
      // Should be a new object, not the same reference
      expect(result).not.toBe(base);
    });

    it('should return base when override is undefined', () => {
      const base = { ...DEFAULT_BRAND_KIT };

      const result = mergeBrandKit(base, undefined);

      expect(result).toEqual(base);
      expect(result).not.toBe(base);
    });

    it('should return copy of base when override is empty object', () => {
      const base = { ...DEFAULT_BRAND_KIT };

      const result = mergeBrandKit(base, {});

      expect(result).toEqual(base);
    });
  });

  describe('deep merging nested objects', () => {
    it('should deep merge colors object', () => {
      const base = { ...DEFAULT_BRAND_KIT };
      const override: BrandKitOverride = {
        colors: {
          primary: '#override-primary',
        },
      };

      const result = mergeBrandKit(base, override);

      expect(result.colors.primary).toBe('#override-primary');
      expect(result.colors.secondary).toBe(base.colors.secondary);
      expect(result.colors.accent).toBe(base.colors.accent);
    });

    it('should deep merge typography object', () => {
      const base = { ...DEFAULT_BRAND_KIT };
      const override: BrandKitOverride = {
        typography: {
          headingFont: 'Override Font',
        },
      };

      const result = mergeBrandKit(base, override);

      expect(result.typography.headingFont).toBe('Override Font');
      expect(result.typography.bodyFont).toBe(base.typography.bodyFont);
      expect(result.typography.baseFontSize).toBe(base.typography.baseFontSize);
    });

    it('should deep merge logos object', () => {
      const base: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        logos: {
          fullUrl: 'https://base.com/full.png',
          iconUrl: 'https://base.com/icon.png',
        },
      };
      const override: BrandKitOverride = {
        logos: {
          iconUrl: 'https://override.com/icon.png',
        },
      };

      const result = mergeBrandKit(base, override);

      expect(result.logos.fullUrl).toBe('https://base.com/full.png');
      expect(result.logos.iconUrl).toBe('https://override.com/icon.png');
    });
  });

  describe('override precedence', () => {
    it('should override values take precedence', () => {
      const base = { ...DEFAULT_BRAND_KIT };
      const override: BrandKitOverride = {
        colors: {
          primary: '#override',
        },
        faviconUrl: 'https://override.com/favicon.ico',
        preset: 'bold',
      };

      const result = mergeBrandKit(base, override);

      expect(result.colors.primary).toBe('#override');
      expect(result.faviconUrl).toBe('https://override.com/favicon.ico');
      expect(result.preset).toBe('bold');
    });

    it('should not replace base values with undefined', () => {
      const base: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        faviconUrl: 'https://base.com/favicon.ico',
        preset: 'elegant',
      };
      const override: BrandKitOverride = {
        colors: {
          primary: '#override',
        },
        // faviconUrl and preset are undefined
      };

      const result = mergeBrandKit(base, override);

      expect(result.faviconUrl).toBe('https://base.com/favicon.ico');
      expect(result.preset).toBe('elegant');
    });

    it('should handle explicit undefined in nested objects', () => {
      const base: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        colors: {
          ...DEFAULT_BRAND_KIT.colors,
          primary: '#base-primary',
        },
      };
      const override: BrandKitOverride = {
        colors: {
          primary: undefined as unknown as string,
          secondary: '#override-secondary',
        },
      };

      const result = mergeBrandKit(base, override);

      // undefined should not override
      expect(result.colors.primary).toBe('#base-primary');
      expect(result.colors.secondary).toBe('#override-secondary');
    });
  });

  describe('edge cases', () => {
    it('should handle override with null faviconUrl', () => {
      const base: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        faviconUrl: 'https://base.com/favicon.ico',
      };
      const override: BrandKitOverride = {
        faviconUrl: undefined,
      };

      const result = mergeBrandKit(base, override);

      expect(result.faviconUrl).toBe('https://base.com/favicon.ico');
    });

    it('should create independent copy (no mutation)', () => {
      const base = { ...DEFAULT_BRAND_KIT };
      const override: BrandKitOverride = {
        colors: {
          primary: '#override',
        },
      };

      const result = mergeBrandKit(base, override);

      // Modify result
      result.colors.primary = '#modified';

      // Base should not be affected
      expect(base.colors.primary).toBe(DEFAULT_BRAND_KIT.colors.primary);
    });
  });
});

// ============================================================================
// getBrandKitCSSVariables Tests
// ============================================================================

describe('getBrandKitCSSVariables', () => {
  describe('color variables', () => {
    it('should return primary color variable', () => {
      const brandKit = { ...DEFAULT_BRAND_KIT };

      const result = getBrandKitCSSVariables(brandKit);

      expect(result['--brand-primary']).toBe(brandKit.colors.primary);
    });

    it('should return all color variables when all colors are set', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        colors: {
          primary: '#primary',
          secondary: '#secondary',
          accent: '#accent',
          background: '#background',
          text: '#text',
          success: '#success',
          warning: '#warning',
          error: '#error',
        },
      };

      const result = getBrandKitCSSVariables(brandKit);

      expect(result['--brand-primary']).toBe('#primary');
      expect(result['--brand-secondary']).toBe('#secondary');
      expect(result['--brand-accent']).toBe('#accent');
      expect(result['--brand-background']).toBe('#background');
      expect(result['--brand-text']).toBe('#text');
      expect(result['--brand-success']).toBe('#success');
      expect(result['--brand-warning']).toBe('#warning');
      expect(result['--brand-error']).toBe('#error');
    });

    it('should omit optional color variables when not set', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        colors: {
          primary: '#primary',
          // All optional colors undefined
          secondary: undefined,
          accent: undefined,
          background: undefined,
          text: undefined,
          success: undefined,
          warning: undefined,
          error: undefined,
        },
      };

      const result = getBrandKitCSSVariables(brandKit);

      expect(result['--brand-primary']).toBe('#primary');
      expect(result['--brand-secondary']).toBeUndefined();
      expect(result['--brand-accent']).toBeUndefined();
      expect(result['--brand-background']).toBeUndefined();
      expect(result['--brand-text']).toBeUndefined();
      expect(result['--brand-success']).toBeUndefined();
      expect(result['--brand-warning']).toBeUndefined();
      expect(result['--brand-error']).toBeUndefined();
    });
  });

  describe('typography variables', () => {
    it('should return typography variables', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Heading Font',
          bodyFont: 'Body Font',
          baseFontSize: 18,
          headingScale: 1.5,
        },
      };

      const result = getBrandKitCSSVariables(brandKit);

      expect(result['--brand-font-heading']).toBe('Heading Font');
      expect(result['--brand-font-body']).toBe('Body Font');
      expect(result['--brand-font-size-base']).toBe('18px');
      expect(result['--brand-heading-scale']).toBe('1.5');
    });

    it('should omit typography variables when not set', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: undefined,
          bodyFont: undefined,
          baseFontSize: undefined,
          headingScale: undefined,
        },
      };

      const result = getBrandKitCSSVariables(brandKit);

      expect(result['--brand-font-heading']).toBeUndefined();
      expect(result['--brand-font-body']).toBeUndefined();
      expect(result['--brand-font-size-base']).toBeUndefined();
      expect(result['--brand-heading-scale']).toBeUndefined();
    });
  });

  describe('handles optional values correctly', () => {
    it('should handle brand kit with minimal values', () => {
      const brandKit: BrandKit = {
        logos: {},
        colors: {
          primary: '#6366f1',
        },
        typography: {},
      };

      const result = getBrandKitCSSVariables(brandKit);

      expect(result['--brand-primary']).toBe('#6366f1');
      // All other variables should not be present
      expect(Object.keys(result).length).toBe(1);
    });

    it('should handle brand kit with full default values', () => {
      const result = getBrandKitCSSVariables(DEFAULT_BRAND_KIT);

      expect(result['--brand-primary']).toBe('#6366f1');
      expect(result['--brand-secondary']).toBe('#3b82f6');
      expect(result['--brand-font-heading']).toBe('Inter');
      expect(result['--brand-font-body']).toBe('Inter');
      expect(result['--brand-font-size-base']).toBe('16px');
      expect(result['--brand-heading-scale']).toBe('1.25');
    });
  });
});

// ============================================================================
// getGoogleFontsUrl Tests
// ============================================================================

describe('getGoogleFontsUrl', () => {
  describe('system fonts handling', () => {
    it('should return null for system-ui font', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'system-ui',
          bodyFont: 'system-ui',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toBeNull();
    });

    it('should return null for sans-serif font', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'sans-serif',
          bodyFont: 'sans-serif',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toBeNull();
    });

    it('should return null for serif font', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'serif',
          bodyFont: 'serif',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toBeNull();
    });

    it('should return null for monospace font', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'monospace',
          bodyFont: 'monospace',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toBeNull();
    });

    it('should return null for common system fonts (Arial, Helvetica, etc.)', () => {
      const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia'];

      for (const font of systemFonts) {
        const brandKit: BrandKit = {
          ...DEFAULT_BRAND_KIT,
          typography: {
            headingFont: font,
            bodyFont: font,
          },
        };

        const result = getGoogleFontsUrl(brandKit);
        expect(result).toBeNull();
      }
    });
  });

  describe('Google fonts URL generation', () => {
    it('should return URL for Google fonts', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Roboto',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).not.toBeNull();
      expect(result).toContain('https://fonts.googleapis.com/css2?');
      expect(result).toContain('family=Inter');
      expect(result).toContain('family=Roboto');
      expect(result).toContain('display=swap');
    });

    it('should include both heading and body fonts', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Playfair Display',
          bodyFont: 'Open Sans',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toContain('Playfair%20Display');
      expect(result).toContain('Open%20Sans');
    });

    it('should not duplicate fonts when heading and body are the same', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).not.toBeNull();
      // Should only have one "family=Inter" in the URL
      const matches = result!.match(/family=Inter/g);
      expect(matches?.length).toBe(1);
    });

    it('should include weight parameters', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Inter',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toContain('wght@400;500;600;700');
    });
  });

  describe('custom fonts array', () => {
    it('should include custom fonts from array', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'system-ui',
          bodyFont: 'system-ui',
          customFonts: ['Lato', 'Poppins'],
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).not.toBeNull();
      expect(result).toContain('family=Lato');
      expect(result).toContain('family=Poppins');
    });

    it('should not duplicate fonts that appear in customFonts and heading/body', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Roboto',
          customFonts: ['Inter', 'Lato'],
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).not.toBeNull();
      // Should only have one "family=Inter" in the URL
      const interMatches = result!.match(/family=Inter/g);
      expect(interMatches?.length).toBe(1);
    });

    it('should skip system fonts in customFonts array', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'system-ui',
          bodyFont: 'system-ui',
          customFonts: ['Arial', 'Helvetica', 'Inter'],
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).not.toBeNull();
      expect(result).toContain('family=Inter');
      expect(result).not.toContain('family=Arial');
      expect(result).not.toContain('family=Helvetica');
    });

    it('should return null when all fonts are system fonts', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'system-ui',
          bodyFont: 'sans-serif',
          customFonts: ['Arial', 'Helvetica'],
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty customFonts array', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Inter',
          customFonts: [],
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).not.toBeNull();
      expect(result).toContain('family=Inter');
    });

    it('should handle undefined fonts gracefully', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: undefined,
          bodyFont: undefined,
          customFonts: undefined,
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toBeNull();
    });

    it('should URL-encode font names with spaces', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        typography: {
          headingFont: 'Source Sans Pro',
        },
      };

      const result = getGoogleFontsUrl(brandKit);

      expect(result).toContain('Source%20Sans%20Pro');
    });
  });
});

// ============================================================================
// getLogoUrl Tests
// ============================================================================

describe('getLogoUrl', () => {
  describe('full context', () => {
    it('should return fullUrl for full context', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
        iconUrl: 'https://example.com/icon.png',
      };

      const result = getLogoUrl(logos, 'full');

      expect(result).toBe('https://example.com/full.png');
    });

    it('should fall back to iconUrl when fullUrl is missing', () => {
      const logos: BrandKitLogo = {
        iconUrl: 'https://example.com/icon.png',
      };

      const result = getLogoUrl(logos, 'full');

      expect(result).toBe('https://example.com/icon.png');
    });

    it('should default to full context when not specified', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
      };

      const result = getLogoUrl(logos);

      expect(result).toBe('https://example.com/full.png');
    });
  });

  describe('icon context', () => {
    it('should return iconUrl for icon context', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
        iconUrl: 'https://example.com/icon.png',
      };

      const result = getLogoUrl(logos, 'icon');

      expect(result).toBe('https://example.com/icon.png');
    });

    it('should fall back to fullUrl when iconUrl is missing', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
      };

      const result = getLogoUrl(logos, 'icon');

      expect(result).toBe('https://example.com/full.png');
    });
  });

  describe('monochrome context', () => {
    it('should return monochromeUrl for monochrome context', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
        monochromeUrl: 'https://example.com/mono.png',
      };

      const result = getLogoUrl(logos, 'monochrome');

      expect(result).toBe('https://example.com/mono.png');
    });

    it('should fall back to fullUrl when monochromeUrl is missing', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
      };

      const result = getLogoUrl(logos, 'monochrome');

      expect(result).toBe('https://example.com/full.png');
    });
  });

  describe('reversed context', () => {
    it('should return reversedUrl for reversed context', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
        reversedUrl: 'https://example.com/reversed.png',
      };

      const result = getLogoUrl(logos, 'reversed');

      expect(result).toBe('https://example.com/reversed.png');
    });

    it('should fall back to fullUrl when reversedUrl is missing', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
      };

      const result = getLogoUrl(logos, 'reversed');

      expect(result).toBe('https://example.com/full.png');
    });
  });

  describe('no logos available', () => {
    it('should return undefined when no logos available', () => {
      const logos: BrandKitLogo = {};

      const result = getLogoUrl(logos, 'full');

      expect(result).toBeUndefined();
    });

    it('should return undefined for icon context with empty logos', () => {
      const logos: BrandKitLogo = {};

      const result = getLogoUrl(logos, 'icon');

      expect(result).toBeUndefined();
    });

    it('should return undefined for monochrome context with empty logos', () => {
      const logos: BrandKitLogo = {};

      const result = getLogoUrl(logos, 'monochrome');

      expect(result).toBeUndefined();
    });

    it('should return undefined for reversed context with empty logos', () => {
      const logos: BrandKitLogo = {};

      const result = getLogoUrl(logos, 'reversed');

      expect(result).toBeUndefined();
    });
  });

  describe('all logos available', () => {
    it('should return correct logo for each context when all are available', () => {
      const logos: BrandKitLogo = {
        fullUrl: 'https://example.com/full.png',
        iconUrl: 'https://example.com/icon.png',
        monochromeUrl: 'https://example.com/mono.png',
        reversedUrl: 'https://example.com/reversed.png',
      };

      expect(getLogoUrl(logos, 'full')).toBe('https://example.com/full.png');
      expect(getLogoUrl(logos, 'icon')).toBe('https://example.com/icon.png');
      expect(getLogoUrl(logos, 'monochrome')).toBe('https://example.com/mono.png');
      expect(getLogoUrl(logos, 'reversed')).toBe('https://example.com/reversed.png');
    });
  });
});

// ============================================================================
// DEFAULT_BRAND_KIT Tests
// ============================================================================

describe('DEFAULT_BRAND_KIT', () => {
  it('should have all required fields defined', () => {
    expect(DEFAULT_BRAND_KIT.logos).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors).toBeDefined();
    expect(DEFAULT_BRAND_KIT.typography).toBeDefined();
  });

  it('should have valid primary color', () => {
    expect(DEFAULT_BRAND_KIT.colors.primary).toBe('#6366f1');
  });

  it('should have all color properties', () => {
    expect(DEFAULT_BRAND_KIT.colors.primary).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.secondary).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.accent).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.background).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.text).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.success).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.warning).toBeDefined();
    expect(DEFAULT_BRAND_KIT.colors.error).toBeDefined();
  });

  it('should have typography defaults', () => {
    expect(DEFAULT_BRAND_KIT.typography.headingFont).toBe('Inter');
    expect(DEFAULT_BRAND_KIT.typography.bodyFont).toBe('Inter');
    expect(DEFAULT_BRAND_KIT.typography.baseFontSize).toBe(16);
    expect(DEFAULT_BRAND_KIT.typography.headingScale).toBe(1.25);
  });

  it('should have minimal preset by default', () => {
    expect(DEFAULT_BRAND_KIT.preset).toBe('minimal');
  });
});
