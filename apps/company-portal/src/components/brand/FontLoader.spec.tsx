/**
 * Unit tests for FontLoader component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FontLoader, getFontUrlFromBrandKit } from './FontLoader';
import { BrandKit } from '@/lib/api';

// ============================================================================
// Test Fixtures
// ============================================================================

const createBrandKit = (overrides: Partial<BrandKit> = {}): BrandKit => ({
  logos: {
    fullUrl: 'https://example.com/full-logo.png',
    iconUrl: 'https://example.com/icon-logo.png',
  },
  colors: {
    primary: '#6366f1',
    secondary: '#3b82f6',
    accent: '#f97316',
    background: '#ffffff',
    text: '#1f2937',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseFontSize: 16,
  },
  preset: 'minimal',
  ...overrides,
});

const SYSTEM_FONTS = [
  'system-ui',
  'sans-serif',
  'serif',
  'monospace',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
];

// ============================================================================
// Tests
// ============================================================================

describe('FontLoader', () => {
  // ==========================================================================
  // Returns null when no custom fonts needed
  // ==========================================================================

  describe('returns null when no custom fonts needed', () => {
    it('should return null when all fonts are system fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Helvetica',
          baseFontSize: 16,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      expect(container.firstChild).toBeNull();
    });

    it.each(SYSTEM_FONTS)(
      'should return null when heading and body fonts are both "%s"',
      (systemFont) => {
        const brandKit = createBrandKit({
          typography: {
            headingFont: systemFont,
            bodyFont: systemFont,
            baseFontSize: 16,
          },
        });

        const { container } = render(<FontLoader brandKit={brandKit} />);

        expect(container.firstChild).toBeNull();
      }
    );

    it('should return null when typography has no fonts defined', () => {
      const brandKit = createBrandKit({
        typography: {},
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when customFonts array is empty', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
          customFonts: [],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when customFonts contains only system fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
          customFonts: ['Arial', 'Helvetica', 'Times New Roman'],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // Renders Google Fonts link when custom fonts needed
  // ==========================================================================

  describe('renders Google Fonts link when custom fonts needed', () => {
    it('should render stylesheet link for custom heading font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Arial',
          baseFontSize: 16,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink).toBeInTheDocument();
      expect(stylesheetLink?.getAttribute('href')).toContain('fonts.googleapis.com');
      expect(stylesheetLink?.getAttribute('href')).toContain('family=Roboto');
    });

    it('should render stylesheet link for custom body font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Georgia',
          bodyFont: 'Open Sans',
          baseFontSize: 16,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink).toBeInTheDocument();
      expect(stylesheetLink?.getAttribute('href')).toContain('family=Open%20Sans');
    });

    it('should include both heading and body fonts when both are custom', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Playfair Display',
          bodyFont: 'Lato',
          baseFontSize: 16,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Playfair%20Display');
      expect(stylesheetLink?.getAttribute('href')).toContain('Lato');
    });

    it('should deduplicate when heading and body fonts are the same custom font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          baseFontSize: 16,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      const href = stylesheetLink?.getAttribute('href') || '';

      // Count occurrences of "Inter" in the URL - should only appear once
      const matches = href.match(/family=Inter/g);
      expect(matches).toHaveLength(1);
    });

    it('should include display=swap parameter for optimal loading', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Poppins',
          bodyFont: 'Arial',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('display=swap');
    });

    it('should include font weights 400, 500, 600, 700', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Montserrat',
          bodyFont: 'Arial',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('wght@400;500;600;700');
    });
  });

  // ==========================================================================
  // Preconnect prop tests
  // ==========================================================================

  describe('preconnect prop', () => {
    it('should NOT render preconnect links when preconnect is false (default)', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Arial',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const preconnectLinks = container.querySelectorAll('link[rel="preconnect"]');
      expect(preconnectLinks).toHaveLength(0);
    });

    it('should NOT render preconnect links when preconnect is explicitly false', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Arial',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} preconnect={false} />);

      const preconnectLinks = container.querySelectorAll('link[rel="preconnect"]');
      expect(preconnectLinks).toHaveLength(0);
    });

    it('should render preconnect links when preconnect is true', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Arial',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} preconnect={true} />);

      const preconnectLinks = container.querySelectorAll('link[rel="preconnect"]');
      expect(preconnectLinks).toHaveLength(2);
    });

    it('should preconnect to fonts.googleapis.com', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} preconnect />);

      const googleFontsPreconnect = container.querySelector(
        'link[rel="preconnect"][href="https://fonts.googleapis.com"]'
      );
      expect(googleFontsPreconnect).toBeInTheDocument();
    });

    it('should preconnect to fonts.gstatic.com with crossOrigin', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} preconnect />);

      const gstaticPreconnect = container.querySelector(
        'link[rel="preconnect"][href="https://fonts.gstatic.com"]'
      );
      expect(gstaticPreconnect).toBeInTheDocument();
      expect(gstaticPreconnect?.getAttribute('crossorigin')).toBe('anonymous');
    });

    it('should NOT render preconnect links when no custom fonts and preconnect is true', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} preconnect />);

      // Component returns null, so no links should be rendered
      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // Various font combinations
  // ==========================================================================

  describe('font combinations', () => {
    it('should render only heading font when body is system font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Oswald',
          bodyFont: 'Arial',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Oswald');
      expect(stylesheetLink?.getAttribute('href')).not.toContain('Arial');
    });

    it('should render only body font when heading is system font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Georgia',
          bodyFont: 'Source Sans Pro',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Source%20Sans%20Pro');
      expect(stylesheetLink?.getAttribute('href')).not.toContain('Georgia');
    });

    it('should handle fonts with multiple words correctly', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Playfair Display',
          bodyFont: 'Source Code Pro',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      const href = stylesheetLink?.getAttribute('href') || '';

      expect(href).toContain('Playfair%20Display');
      expect(href).toContain('Source%20Code%20Pro');
    });

    it('should handle undefined heading font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: undefined,
          bodyFont: 'Nunito',
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Nunito');
    });

    it('should handle undefined body font', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Quicksand',
          bodyFont: undefined,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Quicksand');
    });
  });

  // ==========================================================================
  // Custom fonts array tests
  // ==========================================================================

  describe('customFonts array', () => {
    it('should include fonts from customFonts array', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
          customFonts: ['Fira Code', 'JetBrains Mono'],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Fira%20Code');
      expect(stylesheetLink?.getAttribute('href')).toContain('JetBrains%20Mono');
    });

    it('should combine heading, body, and custom fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Raleway',
          bodyFont: 'Roboto',
          customFonts: ['Inconsolata'],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      const href = stylesheetLink?.getAttribute('href') || '';

      expect(href).toContain('Raleway');
      expect(href).toContain('Roboto');
      expect(href).toContain('Inconsolata');
    });

    it('should deduplicate fonts appearing in both heading/body and customFonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Roboto',
          customFonts: ['Inter', 'Roboto', 'Lato'],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      const href = stylesheetLink?.getAttribute('href') || '';

      // Each font should only appear once
      expect((href.match(/family=Inter/g) || []).length).toBe(1);
      expect((href.match(/family=Roboto/g) || []).length).toBe(1);
      expect((href.match(/family=Lato/g) || []).length).toBe(1);
    });

    it('should filter out system fonts from customFonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
          customFonts: ['Arial', 'Fira Sans', 'system-ui'],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      const href = stylesheetLink?.getAttribute('href') || '';

      expect(href).toContain('Fira%20Sans');
      expect(href).not.toContain('Arial');
      expect(href).not.toContain('system-ui');
    });

    it('should handle empty customFonts array with custom heading/body fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Merriweather',
          bodyFont: 'Open Sans',
          customFonts: [],
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Merriweather');
      expect(stylesheetLink?.getAttribute('href')).toContain('Open%20Sans');
    });

    it('should handle undefined customFonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Work Sans',
          bodyFont: 'Arial',
          customFonts: undefined,
        },
      });

      const { container } = render(<FontLoader brandKit={brandKit} />);

      const stylesheetLink = container.querySelector('link[rel="stylesheet"]');
      expect(stylesheetLink?.getAttribute('href')).toContain('Work%20Sans');
    });
  });

  // ==========================================================================
  // Component re-render tests
  // ==========================================================================

  describe('component updates', () => {
    it('should update when brandKit typography changes', () => {
      const brandKit1 = createBrandKit({
        typography: { headingFont: 'Roboto' },
      });

      const { container, rerender } = render(<FontLoader brandKit={brandKit1} />);

      expect(
        container.querySelector('link[rel="stylesheet"]')?.getAttribute('href')
      ).toContain('Roboto');

      const brandKit2 = createBrandKit({
        typography: { headingFont: 'Lato' },
      });

      rerender(<FontLoader brandKit={brandKit2} />);

      expect(
        container.querySelector('link[rel="stylesheet"]')?.getAttribute('href')
      ).toContain('Lato');
      expect(
        container.querySelector('link[rel="stylesheet"]')?.getAttribute('href')
      ).not.toContain('Roboto');
    });

    it('should update when preconnect prop changes', () => {
      const brandKit = createBrandKit({
        typography: { headingFont: 'Poppins' },
      });

      const { container, rerender } = render(<FontLoader brandKit={brandKit} preconnect={false} />);

      expect(container.querySelectorAll('link[rel="preconnect"]')).toHaveLength(0);

      rerender(<FontLoader brandKit={brandKit} preconnect={true} />);

      expect(container.querySelectorAll('link[rel="preconnect"]')).toHaveLength(2);
    });

    it('should switch from custom to system fonts and render null', () => {
      const brandKit1 = createBrandKit({
        typography: { headingFont: 'Roboto', bodyFont: 'Lato' },
      });

      const { container, rerender } = render(<FontLoader brandKit={brandKit1} />);

      expect(container.querySelector('link[rel="stylesheet"]')).toBeInTheDocument();

      const brandKit2 = createBrandKit({
        typography: { headingFont: 'Arial', bodyFont: 'Georgia' },
      });

      rerender(<FontLoader brandKit={brandKit2} />);

      expect(container.firstChild).toBeNull();
    });
  });
});

// ============================================================================
// getFontUrlFromBrandKit Utility Function Tests
// ============================================================================

describe('getFontUrlFromBrandKit', () => {
  describe('returns correct fontUrl', () => {
    it('should return null fontUrl when all fonts are system fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.fontUrl).toBeNull();
    });

    it('should return Google Fonts URL when custom fonts exist', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Arial',
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.fontUrl).not.toBeNull();
      expect(result.fontUrl).toContain('https://fonts.googleapis.com/css2');
      expect(result.fontUrl).toContain('Roboto');
    });

    it('should include multiple custom fonts in URL', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Playfair Display',
          bodyFont: 'Lato',
          customFonts: ['Fira Code'],
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.fontUrl).toContain('Playfair%20Display');
      expect(result.fontUrl).toContain('Lato');
      expect(result.fontUrl).toContain('Fira%20Code');
    });
  });

  describe('returns correct hasCustomFonts flag', () => {
    it('should return hasCustomFonts=false when all fonts are system fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Helvetica',
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.hasCustomFonts).toBe(false);
    });

    it('should return hasCustomFonts=true when heading font is custom', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Arial',
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.hasCustomFonts).toBe(true);
    });

    it('should return hasCustomFonts=true when body font is custom', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Georgia',
          bodyFont: 'Open Sans',
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.hasCustomFonts).toBe(true);
    });

    it('should return hasCustomFonts=true when customFonts array has custom fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
          customFonts: ['Inconsolata'],
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.hasCustomFonts).toBe(true);
    });

    it('should return hasCustomFonts=false when customFonts only contains system fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Georgia',
          customFonts: ['Arial', 'Helvetica'],
        },
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.hasCustomFonts).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty typography object', () => {
      const brandKit = createBrandKit({
        typography: {},
      });

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.fontUrl).toBeNull();
      expect(result.hasCustomFonts).toBe(false);
    });

    it('should handle brandKit with minimal data', () => {
      const brandKit: BrandKit = {
        logos: {},
        colors: { primary: '#000000' },
        typography: {},
      };

      const result = getFontUrlFromBrandKit(brandKit);

      expect(result.fontUrl).toBeNull();
      expect(result.hasCustomFonts).toBe(false);
    });

    it('should be consistent - fontUrl null implies hasCustomFonts false', () => {
      const testCases = [
        { headingFont: 'Arial', bodyFont: 'Georgia' },
        { headingFont: 'system-ui', bodyFont: 'sans-serif' },
        { headingFont: 'Helvetica', bodyFont: 'Times New Roman' },
        {},
      ];

      testCases.forEach((typography) => {
        const brandKit = createBrandKit({ typography });
        const result = getFontUrlFromBrandKit(brandKit);

        if (result.fontUrl === null) {
          expect(result.hasCustomFonts).toBe(false);
        }
        if (!result.hasCustomFonts) {
          expect(result.fontUrl).toBeNull();
        }
      });
    });

    it('should be consistent - fontUrl present implies hasCustomFonts true', () => {
      const testCases = [
        { headingFont: 'Roboto', bodyFont: 'Georgia' },
        { headingFont: 'Arial', bodyFont: 'Open Sans' },
        { headingFont: 'Lato', bodyFont: 'Montserrat' },
        { headingFont: 'Arial', customFonts: ['Fira Code'] },
      ];

      testCases.forEach((typography) => {
        const brandKit = createBrandKit({ typography });
        const result = getFontUrlFromBrandKit(brandKit);

        if (result.fontUrl !== null) {
          expect(result.hasCustomFonts).toBe(true);
        }
        if (result.hasCustomFonts) {
          expect(result.fontUrl).not.toBeNull();
        }
      });
    });
  });
});
