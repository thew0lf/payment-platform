'use client';

import { BrandKit } from '@/lib/api';

/**
 * Configuration for individual color swatches
 */
interface ColorSwatchConfig {
  key: keyof NonNullable<BrandKit['colors']>;
  label: string;
  defaultValue: string;
}

/**
 * Props for the ColorPalette component
 */
export interface ColorPaletteProps {
  /**
   * The brand kit containing the color definitions
   */
  brandKit: BrandKit;
  /**
   * Layout orientation for displaying color swatches
   * - `horizontal`: Colors displayed in a single row
   * - `vertical`: Colors displayed in a single column
   * - `grid`: Colors displayed in a 4x2 grid (default)
   * @default 'grid'
   */
  layout?: 'horizontal' | 'vertical' | 'grid';
  /**
   * Whether to show color labels (e.g., "Primary", "Secondary")
   * @default true
   */
  showLabels?: boolean;
  /**
   * Whether to show hex values below each color swatch
   * @default true
   */
  showHexValues?: boolean;
  /**
   * Whether to use compact sizing for swatches
   * - `true`: 32x32px swatches with minimal spacing
   * - `false`: 64x64px swatches with more spacing
   * @default false
   */
  compact?: boolean;
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

/**
 * Color swatch configuration defining all brand colors
 * Note: Defaults match DEFAULT_BRAND_KIT from brand-kit-resolver.ts
 */
const COLOR_SWATCHES: ColorSwatchConfig[] = [
  { key: 'primary', label: 'Primary', defaultValue: '#6366f1' },
  { key: 'secondary', label: 'Secondary', defaultValue: '#3b82f6' }, // Matches DEFAULT_BRAND_KIT
  { key: 'accent', label: 'Accent', defaultValue: '#f97316' }, // Matches DEFAULT_BRAND_KIT
  { key: 'background', label: 'Background', defaultValue: '#ffffff' },
  { key: 'text', label: 'Text', defaultValue: '#1f2937' },
  { key: 'success', label: 'Success', defaultValue: '#10b981' },
  { key: 'warning', label: 'Warning', defaultValue: '#f59e0b' },
  { key: 'error', label: 'Error', defaultValue: '#ef4444' },
];

/**
 * Layout class configurations for each layout mode
 */
const LAYOUT_CLASSES: Record<'horizontal' | 'vertical' | 'grid', string> = {
  horizontal: 'flex flex-row flex-wrap',
  vertical: 'flex flex-col',
  grid: 'grid grid-cols-4 sm:grid-cols-4',
};

/**
 * Checkered background pattern for transparency indication
 * Uses inline SVG data URI for the pattern
 */
const CHECKERED_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect width='8' height='8' fill='%23ffffff'/%3E%3Crect x='8' y='0' width='8' height='8' fill='%23e5e5e5'/%3E%3Crect x='0' y='8' width='8' height='8' fill='%23e5e5e5'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23ffffff'/%3E%3C/svg%3E")`;

/**
 * ColorPalette displays the brand kit color palette for preview purposes.
 *
 * This component is designed for use in funnel builder preview panels,
 * brand kit settings pages, and anywhere brand colors need to be visualized.
 *
 * Features:
 * - Displays all 8 brand colors (primary, secondary, accent, background, text, success, warning, error)
 * - Supports horizontal, vertical, and grid layouts
 * - Shows checkered background pattern behind swatches to reveal transparency
 * - Optional labels and hex value display
 * - Compact mode for space-constrained UIs
 * - Full accessibility support with aria-labels
 *
 * @example
 * // Basic usage with default grid layout
 * <ColorPalette brandKit={brandKit} />
 *
 * @example
 * // Horizontal layout with compact swatches
 * <ColorPalette
 *   brandKit={brandKit}
 *   layout="horizontal"
 *   compact={true}
 *   showHexValues={false}
 * />
 *
 * @example
 * // Vertical layout showing all details
 * <ColorPalette
 *   brandKit={brandKit}
 *   layout="vertical"
 *   showLabels={true}
 *   showHexValues={true}
 * />
 *
 * @example
 * // Grid layout with custom styling
 * <ColorPalette
 *   brandKit={brandKit}
 *   layout="grid"
 *   className="p-4 bg-gray-100 rounded-lg"
 * />
 */
export function ColorPalette({
  brandKit,
  layout = 'grid',
  showLabels = true,
  showHexValues = true,
  compact = false,
  className = '',
}: ColorPaletteProps) {
  const colors = brandKit.colors;

  // Determine spacing based on compact mode
  const gapClass = compact ? 'gap-2' : 'gap-4';

  // Determine swatch size based on compact mode
  const swatchSize = compact ? 'w-8 h-8' : 'w-16 h-16';

  return (
    <div
      className={`${LAYOUT_CLASSES[layout]} ${gapClass} ${className}`}
      role="group"
      aria-label="Brand color palette"
    >
      {COLOR_SWATCHES.map((swatch) => {
        const colorValue = colors[swatch.key] ?? swatch.defaultValue;

        return (
          <div
            key={swatch.key}
            className={`flex ${layout === 'horizontal' ? 'flex-col items-center' : layout === 'vertical' ? 'flex-row items-center' : 'flex-col items-center'}`}
          >
            {/* Color swatch with checkered background for transparency */}
            <div
              className={`${swatchSize} rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0`}
              style={{
                backgroundImage: CHECKERED_PATTERN,
                backgroundSize: '16px 16px',
              }}
              aria-label={`${swatch.label} color: ${colorValue}`}
              role="img"
            >
              <div
                className="w-full h-full"
                style={{ backgroundColor: colorValue }}
              />
            </div>

            {/* Labels and hex values */}
            {(showLabels || showHexValues) && (
              <div
                className={`${layout === 'vertical' ? 'ml-3' : 'mt-1'} ${compact ? 'text-xs' : 'text-sm'} text-center ${layout === 'vertical' ? 'text-left' : ''}`}
              >
                {showLabels && (
                  <p className="font-medium text-gray-700 dark:text-gray-300 leading-tight">
                    {swatch.label}
                  </p>
                )}
                {showHexValues && (
                  <p className="text-gray-500 dark:text-gray-400 font-mono leading-tight">
                    {colorValue.toUpperCase()}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ColorPalette;
