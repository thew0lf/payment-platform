/**
 * Unit tests for ColorPalette component
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ColorPalette } from './ColorPalette';
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

const createEmptyColorsBrandKit = (): BrandKit => ({
  logos: {},
  colors: {
    primary: '#6366f1', // Only required field
  },
  typography: {},
});

// Default color values from the component
// These match DEFAULT_BRAND_KIT from brand-kit-resolver.ts
const DEFAULT_COLORS = {
  primary: '#6366f1',
  secondary: '#3b82f6', // Matches DEFAULT_BRAND_KIT
  accent: '#f97316', // Matches DEFAULT_BRAND_KIT
  background: '#ffffff',
  text: '#1f2937',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const COLOR_LABELS = [
  'Primary',
  'Secondary',
  'Accent',
  'Background',
  'Text',
  'Success',
  'Warning',
  'Error',
];

// ============================================================================
// Tests
// ============================================================================

describe('ColorPalette', () => {
  // ==========================================================================
  // Basic Rendering
  // ==========================================================================

  describe('renders all 8 brand colors', () => {
    it('should render exactly 8 color swatches', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const swatches = screen.getAllByRole('img');
      expect(swatches).toHaveLength(8);
    });

    it('should render swatches for all color labels', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      COLOR_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should display correct hex values for each color', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByText('#6366F1')).toBeInTheDocument(); // Primary
      expect(screen.getByText('#3B82F6')).toBeInTheDocument(); // Secondary
      expect(screen.getByText('#F97316')).toBeInTheDocument(); // Accent
      expect(screen.getByText('#FFFFFF')).toBeInTheDocument(); // Background
      expect(screen.getByText('#1F2937')).toBeInTheDocument(); // Text
      expect(screen.getByText('#10B981')).toBeInTheDocument(); // Success
      expect(screen.getByText('#F59E0B')).toBeInTheDocument(); // Warning
      expect(screen.getByText('#EF4444')).toBeInTheDocument(); // Error
    });
  });

  // ==========================================================================
  // Layout Tests
  // ==========================================================================

  describe('layout variants', () => {
    it('should render with grid layout by default', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('grid');
      expect(wrapper.className).toContain('grid-cols-4');
    });

    it('should render with horizontal layout when specified', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} layout="horizontal" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('flex-row');
      expect(wrapper.className).toContain('flex-wrap');
    });

    it('should render with vertical layout when specified', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} layout="vertical" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('flex-col');
    });

    it('should render with grid layout when explicitly specified', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} layout="grid" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('grid');
      expect(wrapper.className).toContain('grid-cols-4');
    });
  });

  // ==========================================================================
  // showLabels Prop Tests
  // ==========================================================================

  describe('showLabels prop', () => {
    it('should show labels by default', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      COLOR_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should show labels when showLabels is true', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} showLabels={true} />);

      COLOR_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should hide labels when showLabels is false', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} showLabels={false} />);

      COLOR_LABELS.forEach((label) => {
        expect(screen.queryByText(label)).not.toBeInTheDocument();
      });
    });

    it('should still show hex values when labels are hidden', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} showLabels={false} showHexValues={true} />);

      expect(screen.getByText('#6366F1')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // showHexValues Prop Tests
  // ==========================================================================

  describe('showHexValues prop', () => {
    it('should show hex values by default', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByText('#6366F1')).toBeInTheDocument();
      expect(screen.getByText('#EF4444')).toBeInTheDocument();
    });

    it('should show hex values when showHexValues is true', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} showHexValues={true} />);

      expect(screen.getByText('#6366F1')).toBeInTheDocument();
    });

    it('should hide hex values when showHexValues is false', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} showHexValues={false} />);

      expect(screen.queryByText('#6366F1')).not.toBeInTheDocument();
      expect(screen.queryByText('#EF4444')).not.toBeInTheDocument();
    });

    it('should still show labels when hex values are hidden', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} showHexValues={false} showLabels={true} />);

      COLOR_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should uppercase hex values in display', () => {
      const brandKit = createBrandKit({
        colors: {
          primary: '#abcdef',
          secondary: '#123456',
        },
      });

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByText('#ABCDEF')).toBeInTheDocument();
      expect(screen.getByText('#123456')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // compact Prop Tests
  // ==========================================================================

  describe('compact prop', () => {
    it('should use regular sizing by default', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} />);

      // Check gap class for non-compact mode
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-4');

      // Check swatch size (w-16 h-16 = 64px)
      const swatches = screen.getAllByRole('img');
      expect(swatches[0].className).toContain('w-16');
      expect(swatches[0].className).toContain('h-16');
    });

    it('should use compact sizing when compact is true', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} compact={true} />);

      // Check gap class for compact mode
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-2');

      // Check swatch size (w-8 h-8 = 32px)
      const swatches = screen.getAllByRole('img');
      expect(swatches[0].className).toContain('w-8');
      expect(swatches[0].className).toContain('h-8');
    });

    it('should use regular sizing when compact is false', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} compact={false} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-4');

      const swatches = screen.getAllByRole('img');
      expect(swatches[0].className).toContain('w-16');
      expect(swatches[0].className).toContain('h-16');
    });

    it('should use smaller text in compact mode', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} compact={true} />);

      // Find the text container and check for text-xs class
      const primaryLabel = screen.getByText('Primary');
      const textContainer = primaryLabel.parentElement;
      expect(textContainer?.className).toContain('text-xs');
    });

    it('should use regular text size in non-compact mode', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} compact={false} />);

      const primaryLabel = screen.getByText('Primary');
      const textContainer = primaryLabel.parentElement;
      expect(textContainer?.className).toContain('text-sm');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('accessibility', () => {
    it('should have role="group" on the container', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const group = screen.getByRole('group');
      expect(group).toBeInTheDocument();
    });

    it('should have aria-label="Brand color palette" on the container', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'Brand color palette');
    });

    it('should have role="img" on each color swatch', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const swatches = screen.getAllByRole('img');
      expect(swatches).toHaveLength(8);
    });

    it('should have descriptive aria-label on each color swatch', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByLabelText('Primary color: #6366f1')).toBeInTheDocument();
      expect(screen.getByLabelText('Secondary color: #3b82f6')).toBeInTheDocument();
      expect(screen.getByLabelText('Accent color: #f97316')).toBeInTheDocument();
      expect(screen.getByLabelText('Background color: #ffffff')).toBeInTheDocument();
      expect(screen.getByLabelText('Text color: #1f2937')).toBeInTheDocument();
      expect(screen.getByLabelText('Success color: #10b981')).toBeInTheDocument();
      expect(screen.getByLabelText('Warning color: #f59e0b')).toBeInTheDocument();
      expect(screen.getByLabelText('Error color: #ef4444')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Default Value Fallback Tests
  // ==========================================================================

  describe('default value fallbacks', () => {
    it('should use default values when colors are not provided', () => {
      const brandKit = createEmptyColorsBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      // Primary is provided, others should fall back to defaults
      expect(screen.getByText('#6366F1')).toBeInTheDocument(); // Provided primary
      expect(screen.getByText('#3B82F6')).toBeInTheDocument(); // Default secondary (matches DEFAULT_BRAND_KIT)
      expect(screen.getByText('#F97316')).toBeInTheDocument(); // Default accent (matches DEFAULT_BRAND_KIT)
      expect(screen.getByText('#F59E0B')).toBeInTheDocument(); // Default warning
      expect(screen.getByText('#FFFFFF')).toBeInTheDocument(); // Default background
      expect(screen.getByText('#1F2937')).toBeInTheDocument(); // Default text
      expect(screen.getByText('#10B981')).toBeInTheDocument(); // Default success
      expect(screen.getByText('#EF4444')).toBeInTheDocument(); // Default error
    });

    it('should use correct default for secondary color', () => {
      const brandKit = createEmptyColorsBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByLabelText(`Secondary color: ${DEFAULT_COLORS.secondary}`)).toBeInTheDocument();
    });

    it('should prefer provided color over default', () => {
      const customSecondary = '#123456';
      const brandKit = createBrandKit({
        colors: {
          primary: '#6366f1',
          secondary: customSecondary,
        },
      });

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByText('#123456')).toBeInTheDocument();
      expect(screen.queryByText('#3B82F6')).not.toBeInTheDocument(); // Default secondary not shown
    });

    it('should use default value in aria-label when color is missing', () => {
      const brandKit = createEmptyColorsBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByLabelText(`Secondary color: ${DEFAULT_COLORS.secondary}`)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Custom className Tests
  // ==========================================================================

  describe('custom className', () => {
    it('should apply custom className to container', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <ColorPalette brandKit={brandKit} className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });

    it('should merge custom className with layout classes', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <ColorPalette brandKit={brandKit} layout="horizontal" className="my-custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('flex-row');
      expect(wrapper.className).toContain('my-custom-class');
    });

    it('should handle empty className gracefully', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} className="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('grid');
    });
  });

  // ==========================================================================
  // Color Swatch Visual Tests
  // ==========================================================================

  describe('color swatch visuals', () => {
    it('should apply background color to inner div of each swatch', () => {
      const brandKit = createBrandKit();

      const { container } = render(<ColorPalette brandKit={brandKit} />);

      // Find color swatches with role="img"
      const swatches = screen.getAllByRole('img');

      // Each swatch should have a child div with backgroundColor style
      swatches.forEach((swatch, index) => {
        const colorDiv = swatch.querySelector('div');
        expect(colorDiv).toBeTruthy();
        expect(colorDiv?.style.backgroundColor).toBeTruthy();
      });
    });

    it('should have checkered background pattern for transparency indication', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const swatches = screen.getAllByRole('img');
      swatches.forEach((swatch) => {
        // Check that backgroundSize is set for the pattern
        expect(swatch.style.backgroundSize).toBe('16px 16px');
      });
    });

    it('should have border on color swatches', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const swatches = screen.getAllByRole('img');
      swatches.forEach((swatch) => {
        expect(swatch.className).toContain('border');
        expect(swatch.className).toContain('border-gray-200');
      });
    });

    it('should have rounded corners on swatches', () => {
      const brandKit = createBrandKit();

      render(<ColorPalette brandKit={brandKit} />);

      const swatches = screen.getAllByRole('img');
      swatches.forEach((swatch) => {
        expect(swatch.className).toContain('rounded-md');
      });
    });
  });

  // ==========================================================================
  // Props Combination Tests
  // ==========================================================================

  describe('props combinations', () => {
    it('should render correctly with all props disabled', () => {
      const brandKit = createBrandKit();

      render(
        <ColorPalette
          brandKit={brandKit}
          showLabels={false}
          showHexValues={false}
          compact={true}
        />
      );

      // Should render swatches but no labels or hex values
      const swatches = screen.getAllByRole('img');
      expect(swatches).toHaveLength(8);

      COLOR_LABELS.forEach((label) => {
        expect(screen.queryByText(label)).not.toBeInTheDocument();
      });
    });

    it('should render horizontal layout with compact mode', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <ColorPalette brandKit={brandKit} layout="horizontal" compact={true} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-row');
      expect(wrapper.className).toContain('gap-2');
    });

    it('should render vertical layout with all labels and hex values', () => {
      const brandKit = createBrandKit();

      const { container } = render(
        <ColorPalette
          brandKit={brandKit}
          layout="vertical"
          showLabels={true}
          showHexValues={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-col');

      COLOR_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle brand kit with null-like color values', () => {
      const brandKit: BrandKit = {
        logos: {},
        colors: {
          primary: '#6366f1',
          secondary: undefined,
          accent: undefined,
        },
        typography: {},
      };

      render(<ColorPalette brandKit={brandKit} />);

      // Should fall back to defaults
      expect(screen.getByText('#3B82F6')).toBeInTheDocument(); // Default secondary (matches DEFAULT_BRAND_KIT)
    });

    it('should handle lowercase hex values', () => {
      const brandKit = createBrandKit({
        colors: {
          primary: '#aabbcc',
        },
      });

      render(<ColorPalette brandKit={brandKit} />);

      // Should uppercase in display
      expect(screen.getByText('#AABBCC')).toBeInTheDocument();
    });

    it('should handle 3-character hex values', () => {
      const brandKit = createBrandKit({
        colors: {
          primary: '#abc',
        },
      });

      render(<ColorPalette brandKit={brandKit} />);

      expect(screen.getByText('#ABC')).toBeInTheDocument();
    });

    it('should handle brand kit with empty colors object structure', () => {
      const brandKit: BrandKit = {
        logos: {},
        colors: {
          primary: '#000000',
        },
        typography: {},
      };

      render(<ColorPalette brandKit={brandKit} />);

      const swatches = screen.getAllByRole('img');
      expect(swatches).toHaveLength(8);
    });
  });

  // ==========================================================================
  // Component Re-render Tests
  // ==========================================================================

  describe('component updates', () => {
    it('should update when brandKit colors change', () => {
      const brandKit1 = createBrandKit({
        colors: { primary: '#111111' },
      });

      const { rerender } = render(<ColorPalette brandKit={brandKit1} />);

      expect(screen.getByText('#111111')).toBeInTheDocument();

      const brandKit2 = createBrandKit({
        colors: { primary: '#222222' },
      });

      rerender(<ColorPalette brandKit={brandKit2} />);

      expect(screen.getByText('#222222')).toBeInTheDocument();
      expect(screen.queryByText('#111111')).not.toBeInTheDocument();
    });

    it('should update when layout prop changes', () => {
      const brandKit = createBrandKit();

      const { container, rerender } = render(
        <ColorPalette brandKit={brandKit} layout="grid" />
      );

      let wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('grid');

      rerender(<ColorPalette brandKit={brandKit} layout="horizontal" />);

      wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-row');
      expect(wrapper.className).not.toContain('grid');
    });

    it('should update when compact prop changes', () => {
      const brandKit = createBrandKit();

      const { container, rerender } = render(
        <ColorPalette brandKit={brandKit} compact={false} />
      );

      let wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-4');

      rerender(<ColorPalette brandKit={brandKit} compact={true} />);

      wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-2');
    });
  });
});
