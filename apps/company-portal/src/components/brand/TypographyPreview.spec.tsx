/**
 * Unit tests for TypographyPreview component
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { TypographyPreview } from './TypographyPreview';
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
    headingScale: 1.25,
  },
  preset: 'minimal',
  ...overrides,
});

const createEmptyTypographyBrandKit = (): BrandKit => ({
  logos: {},
  colors: {
    primary: '#6366f1',
  },
  typography: {},
});

const createCustomFontsBrandKit = (): BrandKit => ({
  logos: {},
  colors: {
    primary: '#6366f1',
  },
  typography: {
    headingFont: 'Playfair Display',
    bodyFont: 'Open Sans',
    baseFontSize: 18,
    headingScale: 1.333,
    customFonts: ['Playfair Display', 'Open Sans'],
  },
});

// Default typography values matching the component
const DEFAULT_TYPOGRAPHY = {
  headingFont: 'Inter',
  bodyFont: 'Inter',
  baseFontSize: 16,
  headingScale: 1.25,
};

// Known scale names from the component
const SCALE_NAMES: Record<number, string> = {
  1.067: 'Minor Second',
  1.125: 'Major Second',
  1.2: 'Minor Third',
  1.25: 'Major Third',
  1.333: 'Perfect Fourth',
  1.414: 'Augmented Fourth',
  1.5: 'Perfect Fifth',
  1.618: 'Golden Ratio',
};

// Heading levels for testing
const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// ============================================================================
// Tests
// ============================================================================

describe('TypographyPreview', () => {
  // ==========================================================================
  // Compact Mode Tests
  // ==========================================================================

  describe('compact mode', () => {
    it('should render minimal preview with heading and body font info', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      // Should show font info row
      expect(screen.getByText('Heading:')).toBeInTheDocument();
      expect(screen.getByText('Body:')).toBeInTheDocument();
      expect(screen.getByText('Base:')).toBeInTheDocument();
    });

    it('should display font names in compact mode', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Roboto',
          bodyFont: 'Open Sans',
          baseFontSize: 16,
        },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(screen.getByText('Roboto')).toBeInTheDocument();
      expect(screen.getByText('Open Sans')).toBeInTheDocument();
    });

    it('should display base font size in compact mode', () => {
      const brandKit = createBrandKit({
        typography: {
          baseFontSize: 18,
        },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(screen.getByText('18px')).toBeInTheDocument();
    });

    it('should render heading sample text in compact mode', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(screen.getByText('The quick brown fox')).toBeInTheDocument();
    });

    it('should render body sample text in compact mode', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(
        screen.getByText('The quick brown fox jumps over the lazy dog.')
      ).toBeInTheDocument();
    });

    it('should NOT render full type scale in compact mode', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      // Type Scale heading should not be present
      expect(screen.queryByText('Type Scale')).not.toBeInTheDocument();

      // Individual heading labels (h1, h2, etc.) should not be present
      HEADING_LEVELS.forEach((level) => {
        expect(screen.queryByText(level)).not.toBeInTheDocument();
      });
    });

    it('should have role="group" and aria-label in compact mode', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'Typography preview');
    });

    it('should apply custom className in compact mode', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <TypographyPreview brandKit={brandKit} mode="compact" className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });
  });

  // ==========================================================================
  // Full Mode Tests
  // ==========================================================================

  describe('full mode', () => {
    it('should render full mode by default', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      // Should show Type Scale heading
      expect(screen.getByText('Type Scale')).toBeInTheDocument();
    });

    it('should render complete type scale with all heading levels (h1-h6)', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // Should show all heading levels (displayed as lowercase in component)
      HEADING_LEVELS.forEach((level) => {
        expect(screen.getByText(level)).toBeInTheDocument();
      });
    });

    it('should display typography settings in full mode', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Montserrat',
          bodyFont: 'Lato',
          baseFontSize: 16,
          headingScale: 1.25,
        },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByText('Heading Font')).toBeInTheDocument();
      expect(screen.getByText('Montserrat')).toBeInTheDocument();
      expect(screen.getByText('Body Font')).toBeInTheDocument();
      expect(screen.getByText('Lato')).toBeInTheDocument();
      expect(screen.getByText('Base Size')).toBeInTheDocument();
      expect(screen.getByText('Scale')).toBeInTheDocument();
    });

    it('should display body text section in full mode', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByText('Body Text')).toBeInTheDocument();
      expect(
        screen.getByText(/The quick brown fox jumps over the lazy dog\. This is a sample of body text/)
      ).toBeInTheDocument();
    });

    it('should have role="group" and aria-label in full mode', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'Typography preview with full type scale');
    });

    it('should render typography settings region', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      const settingsRegion = screen.getByRole('region', { name: 'Typography settings' });
      expect(settingsRegion).toBeInTheDocument();
    });

    it('should render heading type scale region', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      const scaleRegion = screen.getByRole('region', { name: 'Heading type scale' });
      expect(scaleRegion).toBeInTheDocument();
    });

    it('should render body text preview region', () => {
      const brandKit = createBrandKit();

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      const bodyRegion = screen.getByRole('region', { name: 'Body text preview' });
      expect(bodyRegion).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Typography Settings Display Tests
  // ==========================================================================

  describe('typography settings display', () => {
    it('should display heading font correctly', () => {
      const brandKit = createBrandKit({
        typography: { headingFont: 'Poppins' },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Poppins')).toBeInTheDocument();
    });

    it('should display body font correctly', () => {
      const brandKit = createBrandKit({
        typography: { bodyFont: 'Source Sans Pro' },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Source Sans Pro')).toBeInTheDocument();
    });

    it('should display base font size with px unit', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 18 },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      // Should appear in settings section and body text section
      const sizeLabels = screen.getAllByText('18px');
      expect(sizeLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should display heading scale with human-readable name', () => {
      const brandKit = createBrandKit({
        typography: { headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Major Third')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Default Values Tests
  // ==========================================================================

  describe('default values when typography is missing', () => {
    it('should use default heading font when not provided', () => {
      const brandKit = createEmptyTypographyBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      // Inter appears multiple times (heading font, body font), at least one should be present
      const interElements = screen.getAllByText(DEFAULT_TYPOGRAPHY.headingFont);
      expect(interElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should use default body font when not provided', () => {
      const brandKit = createEmptyTypographyBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      // Inter appears for both heading and body
      const interElements = screen.getAllByText('Inter');
      expect(interElements.length).toBe(2);
    });

    it('should use default base font size when not provided', () => {
      const brandKit = createEmptyTypographyBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      // 16px should appear in settings and body text section
      const sizeLabels = screen.getAllByText('16px');
      expect(sizeLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should use default heading scale when not provided', () => {
      const brandKit = createEmptyTypographyBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      // Default scale is 1.25 = Major Third
      expect(screen.getByText('Major Third')).toBeInTheDocument();
    });

    it('should calculate font sizes using default values', () => {
      const brandKit = createEmptyTypographyBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      // h6 should be at base size (16px with exponent 0)
      const h6Size = '16px';
      expect(screen.getAllByText(h6Size).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Custom Fonts Note Tests
  // ==========================================================================

  describe('custom fonts note', () => {
    it('should show custom fonts note when customFonts array exists', () => {
      const brandKit = createCustomFontsBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Custom fonts:')).toBeInTheDocument();
    });

    it('should display custom font names', () => {
      const brandKit = createCustomFontsBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Playfair Display, Open Sans')).toBeInTheDocument();
    });

    it('should have role="note" on custom fonts element', () => {
      const brandKit = createCustomFontsBrandKit();

      render(<TypographyPreview brandKit={brandKit} />);

      const noteElement = screen.getByRole('note');
      expect(noteElement).toBeInTheDocument();
      expect(noteElement).toHaveAttribute('aria-label', 'Custom fonts included');
    });

    it('should NOT show custom fonts note when customFonts is empty', () => {
      const brandKit = createBrandKit({
        typography: {
          customFonts: [],
        },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.queryByText('Custom fonts:')).not.toBeInTheDocument();
    });

    it('should NOT show custom fonts note when customFonts is undefined', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          baseFontSize: 16,
          // customFonts not defined
        },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.queryByText('Custom fonts:')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have aria-label on heading font sample in compact mode', () => {
      const brandKit = createBrandKit({
        typography: { headingFont: 'Roboto' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(screen.getByLabelText('Heading font sample: Roboto')).toBeInTheDocument();
    });

    it('should have aria-label on body font sample in compact mode', () => {
      const brandKit = createBrandKit({
        typography: { bodyFont: 'Open Sans' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(screen.getByLabelText('Body font sample: Open Sans')).toBeInTheDocument();
    });

    it('should have aria-label on each heading level in full mode', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // h1 at scale^5 = 16 * 1.25^5 = ~48.8px
      expect(screen.getByLabelText(/Heading 1 at/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Heading 2 at/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Heading 3 at/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Heading 4 at/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Heading 5 at/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Heading 6 at/)).toBeInTheDocument();
    });

    it('should have aria-label on body text in full mode', () => {
      const brandKit = createBrandKit({
        typography: { bodyFont: 'Inter' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByLabelText('Body text sample in Inter')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Font Size Calculation Tests
  // ==========================================================================

  describe('font size calculations', () => {
    it('should calculate h1 size correctly (base * scale^5)', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // 16 * 1.25^5 = 48.828125, rounded to 48.8px
      expect(screen.getByText('48.8px')).toBeInTheDocument();
    });

    it('should calculate h6 size correctly (base * scale^0)', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // 16 * 1.25^0 = 16px
      const h6SizeElements = screen.getAllByText('16px');
      expect(h6SizeElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display whole numbers without decimal', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // h5 = 16 * 1.25^1 = 20px (whole number)
      expect(screen.getByText('20px')).toBeInTheDocument();
    });

    it('should display decimal numbers with one decimal place', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.333 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // h5 = 16 * 1.333^1 = 21.328, rounded to 21.3px
      expect(screen.getByText('21.3px')).toBeInTheDocument();
    });

    it('should calculate sizes with different base font size', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 18, headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // h6 = 18 * 1.25^0 = 18px
      const h6SizeElements = screen.getAllByText('18px');
      expect(h6SizeElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate sizes with different scale', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.5 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // h5 = 16 * 1.5^1 = 24px
      expect(screen.getByText('24px')).toBeInTheDocument();

      // h4 = 16 * 1.5^2 = 36px
      expect(screen.getByText('36px')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Scale Name Tests
  // ==========================================================================

  describe('getScaleName returns correct names', () => {
    it.each([
      [1.067, 'Minor Second'],
      [1.125, 'Major Second'],
      [1.2, 'Minor Third'],
      [1.25, 'Major Third'],
      [1.333, 'Perfect Fourth'],
      [1.414, 'Augmented Fourth'],
      [1.5, 'Perfect Fifth'],
      [1.618, 'Golden Ratio'],
    ])('should return "%s" for scale %d', (scale, expectedName) => {
      const brandKit = createBrandKit({
        typography: { headingScale: scale },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByText(expectedName)).toBeInTheDocument();
    });

    it('should return numeric value for unknown scale', () => {
      const brandKit = createBrandKit({
        typography: { headingScale: 1.35 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByText('1.35x')).toBeInTheDocument();
    });

    it('should match close values (within 0.01)', () => {
      const brandKit = createBrandKit({
        typography: { headingScale: 1.251 }, // Close to 1.25
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByText('Major Third')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Custom className Tests
  // ==========================================================================

  describe('custom className', () => {
    it('should apply custom className to container in full mode', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <TypographyPreview brandKit={brandKit} className="my-custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('my-custom-class');
    });

    it('should merge custom className with default classes', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <TypographyPreview brandKit={brandKit} className="custom-spacing" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('space-y-6');
      expect(wrapper.className).toContain('custom-spacing');
    });

    it('should handle empty className gracefully', () => {
      const brandKit = createBrandKit();

      const { container } = render(<TypographyPreview brandKit={brandKit} className="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('space-y-');
    });
  });

  // ==========================================================================
  // Component Re-render Tests
  // ==========================================================================

  describe('component updates', () => {
    it('should update when typography settings change', () => {
      const brandKit1 = createBrandKit({
        typography: { headingFont: 'Roboto' },
      });

      const { rerender } = render(<TypographyPreview brandKit={brandKit1} />);

      expect(screen.getByText('Roboto')).toBeInTheDocument();

      const brandKit2 = createBrandKit({
        typography: { headingFont: 'Poppins' },
      });

      rerender(<TypographyPreview brandKit={brandKit2} />);

      expect(screen.getByText('Poppins')).toBeInTheDocument();
      expect(screen.queryByText('Roboto')).not.toBeInTheDocument();
    });

    it('should update when mode changes', () => {
      const brandKit = createBrandKit();

      const { rerender } = render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      expect(screen.queryByText('Type Scale')).not.toBeInTheDocument();

      rerender(<TypographyPreview brandKit={brandKit} mode="full" />);

      expect(screen.getByText('Type Scale')).toBeInTheDocument();
    });

    it('should update scale name when headingScale changes', () => {
      const brandKit1 = createBrandKit({
        typography: { headingScale: 1.25 },
      });

      const { rerender } = render(<TypographyPreview brandKit={brandKit1} />);

      expect(screen.getByText('Major Third')).toBeInTheDocument();

      const brandKit2 = createBrandKit({
        typography: { headingScale: 1.618 },
      });

      rerender(<TypographyPreview brandKit={brandKit2} />);

      expect(screen.getByText('Golden Ratio')).toBeInTheDocument();
      expect(screen.queryByText('Major Third')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle undefined typography values gracefully', () => {
      const brandKit: BrandKit = {
        logos: {},
        colors: { primary: '#6366f1' },
        typography: {
          headingFont: undefined,
          bodyFont: undefined,
          baseFontSize: undefined,
          headingScale: undefined,
        },
      };

      render(<TypographyPreview brandKit={brandKit} />);

      // Should fall back to defaults - Inter appears for both heading and body font
      const interElements = screen.getAllByText('Inter');
      expect(interElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Major Third')).toBeInTheDocument();
    });

    it('should handle very small base font size', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 10 },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getAllByText('10px').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very large base font size', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 24 },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getAllByText('24px').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle scale of 1 (no scaling)', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      // All headings should be 16px (16 * 1^n = 16)
      expect(screen.getByText('1x')).toBeInTheDocument();
    });

    it('should handle single custom font', () => {
      const brandKit = createBrandKit({
        typography: {
          customFonts: ['Custom Font'],
        },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Custom Font')).toBeInTheDocument();
    });

    it('should handle multiple custom fonts', () => {
      const brandKit = createBrandKit({
        typography: {
          customFonts: ['Font One', 'Font Two', 'Font Three'],
        },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Font One, Font Two, Font Three')).toBeInTheDocument();
    });

    it('should handle fonts with spaces in names', () => {
      const brandKit = createBrandKit({
        typography: {
          headingFont: 'Playfair Display',
          bodyFont: 'Source Sans Pro',
        },
      });

      render(<TypographyPreview brandKit={brandKit} />);

      expect(screen.getByText('Playfair Display')).toBeInTheDocument();
      expect(screen.getByText('Source Sans Pro')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Style Application Tests
  // ==========================================================================

  describe('style application', () => {
    it('should apply heading font family to heading samples in compact mode', () => {
      const brandKit = createBrandKit({
        typography: { headingFont: 'Georgia' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      const headingSample = screen.getByLabelText('Heading font sample: Georgia');
      expect(headingSample.style.fontFamily).toContain('Georgia');
    });

    it('should apply body font family to body samples in compact mode', () => {
      const brandKit = createBrandKit({
        typography: { bodyFont: 'Arial' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      const bodySample = screen.getByLabelText('Body font sample: Arial');
      expect(bodySample.style.fontFamily).toContain('Arial');
    });

    it('should apply heading font family to type scale in full mode', () => {
      const brandKit = createBrandKit({
        typography: { headingFont: 'Montserrat' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      const h1Sample = screen.getByLabelText(/Heading 1 at/);
      expect(h1Sample.style.fontFamily).toContain('Montserrat');
    });

    it('should apply body font family to body text in full mode', () => {
      const brandKit = createBrandKit({
        typography: { bodyFont: 'Lato' },
      });

      render(<TypographyPreview brandKit={brandKit} mode="full" />);

      const bodySample = screen.getByLabelText('Body text sample in Lato');
      expect(bodySample.style.fontFamily).toContain('Lato');
    });

    it('should apply calculated font size to heading samples in compact mode', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 16, headingScale: 1.25 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      const headingSample = screen.getByLabelText(/Heading font sample/);
      // Compact mode uses h3 scale (exponent 3): 16 * 1.25^3 = 31.25px
      expect(headingSample.style.fontSize).toBe('31.3px');
    });

    it('should apply base font size to body samples', () => {
      const brandKit = createBrandKit({
        typography: { baseFontSize: 18 },
      });

      render(<TypographyPreview brandKit={brandKit} mode="compact" />);

      const bodySample = screen.getByLabelText(/Body font sample/);
      expect(bodySample.style.fontSize).toBe('18px');
    });
  });
});
