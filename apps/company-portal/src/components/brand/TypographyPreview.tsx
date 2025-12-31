'use client';

import { BrandKit } from '@/lib/api';
import { DEFAULT_BRAND_KIT } from '@/lib/brand-kit-resolver';

/**
 * Default typography values - imported from DEFAULT_BRAND_KIT to ensure consistency
 */
const DEFAULT_TYPOGRAPHY = DEFAULT_BRAND_KIT.typography;

/**
 * Heading level configuration for the type scale
 */
interface HeadingLevel {
  /** HTML heading level (h1-h6) */
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Display label for the heading */
  label: string;
  /** Exponent for scale calculation (h1=5, h2=4, etc.) */
  scaleExponent: number;
}

/**
 * Heading levels configuration for type scale display
 * Uses modular scale where each level is multiplied by headingScale^exponent
 *
 * Note: H6 has scaleExponent of 0.5 (slightly larger than body text).
 * This follows traditional typography principles where H6 should be
 * visually distinguished but not dramatically different from body text.
 * The font-weight (semibold) provides additional visual hierarchy.
 */
const HEADING_LEVELS: HeadingLevel[] = [
  { level: 'h1', label: 'Heading 1', scaleExponent: 5 },
  { level: 'h2', label: 'Heading 2', scaleExponent: 4 },
  { level: 'h3', label: 'Heading 3', scaleExponent: 3 },
  { level: 'h4', label: 'Heading 4', scaleExponent: 2 },
  { level: 'h5', label: 'Heading 5', scaleExponent: 1 },
  { level: 'h6', label: 'Heading 6', scaleExponent: 0.5 },
];

/**
 * Props for the TypographyPreview component
 */
export interface TypographyPreviewProps {
  /**
   * The brand kit containing the typography definitions
   */
  brandKit: BrandKit;
  /**
   * Display mode for the typography preview
   * - `compact`: Shows minimal preview with heading and body font samples
   * - `full`: Shows complete type scale with all heading levels and body text
   * @default 'full'
   */
  mode?: 'compact' | 'full';
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

/**
 * Calculate font size based on base size and modular scale
 *
 * @param baseFontSize - Base font size in pixels
 * @param headingScale - Scale multiplier (e.g., 1.25 for "Major Third")
 * @param exponent - Scale exponent (higher = larger)
 * @returns Calculated font size in pixels
 *
 * @example
 * ```typescript
 * calculateFontSize(16, 1.25, 5) // Returns 48.83 (h1)
 * calculateFontSize(16, 1.25, 0) // Returns 16 (h6/body)
 * ```
 */
function calculateFontSize(
  baseFontSize: number,
  headingScale: number,
  exponent: number
): number {
  return baseFontSize * Math.pow(headingScale, exponent);
}

/**
 * Format font size for display with appropriate precision
 *
 * @param size - Font size in pixels
 * @returns Formatted string (e.g., "16px" or "48.8px")
 */
function formatFontSize(size: number): string {
  // Round to 1 decimal place, but show as integer if whole number
  const rounded = Math.round(size * 10) / 10;
  return `${rounded % 1 === 0 ? Math.round(rounded) : rounded.toFixed(1)}px`;
}

/**
 * Get a human-readable name for common scale ratios
 *
 * @param scale - The heading scale value
 * @returns Human-readable scale name or the numeric value
 */
function getScaleName(scale: number): string {
  const scaleNames: Record<number, string> = {
    1.067: 'Minor Second',
    1.125: 'Major Second',
    1.2: 'Minor Third',
    1.25: 'Major Third',
    1.333: 'Perfect Fourth',
    1.414: 'Augmented Fourth',
    1.5: 'Perfect Fifth',
    1.618: 'Golden Ratio',
  };

  // Check for exact match or close match (within 0.01)
  for (const [value, name] of Object.entries(scaleNames)) {
    if (Math.abs(parseFloat(value) - scale) < 0.01) {
      return name;
    }
  }

  return `${scale}x`;
}

/**
 * TypographyPreview displays the brand kit typography settings for preview purposes.
 *
 * This component is designed for use in funnel builder preview panels,
 * brand kit settings pages, and anywhere typography settings need to be visualized.
 *
 * Features:
 * - Displays heading font, body font, base font size, and heading scale
 * - Shows sample text in both heading and body font styles
 * - Calculates and displays the modular type scale (h1-h6)
 * - Supports compact and full display modes
 * - Full accessibility support with aria-labels and semantic structure
 *
 * Type Scale Calculation:
 * The component uses a modular scale based on the headingScale value.
 * Each heading level is calculated as: baseFontSize * (headingScale ^ exponent)
 * - h1: baseFontSize * scale^5
 * - h2: baseFontSize * scale^4
 * - h3: baseFontSize * scale^3
 * - h4: baseFontSize * scale^2
 * - h5: baseFontSize * scale^1
 * - h6: baseFontSize * scale^0 (equals base)
 *
 * @example
 * // Basic usage with full display mode
 * <TypographyPreview brandKit={brandKit} />
 *
 * @example
 * // Compact mode for space-constrained UIs
 * <TypographyPreview
 *   brandKit={brandKit}
 *   mode="compact"
 * />
 *
 * @example
 * // Full mode with custom styling
 * <TypographyPreview
 *   brandKit={brandKit}
 *   mode="full"
 *   className="p-4 bg-gray-50 rounded-lg"
 * />
 *
 * @example
 * // In a brand kit settings panel
 * <div className="space-y-6">
 *   <ColorPalette brandKit={brandKit} />
 *   <TypographyPreview brandKit={brandKit} mode="full" />
 * </div>
 */
export function TypographyPreview({
  brandKit,
  mode = 'full',
  className = '',
}: TypographyPreviewProps) {
  const typography = brandKit.typography;

  // Get typography values with defaults
  // Use explicit fallbacks since BrandKitTypography fields are optional
  const headingFont = typography.headingFont ?? DEFAULT_TYPOGRAPHY.headingFont ?? 'Inter';
  const bodyFont = typography.bodyFont ?? DEFAULT_TYPOGRAPHY.bodyFont ?? 'Inter';
  const baseFontSize = typography.baseFontSize ?? DEFAULT_TYPOGRAPHY.baseFontSize ?? 16;
  const headingScale = typography.headingScale ?? DEFAULT_TYPOGRAPHY.headingScale ?? 1.25;

  // Sample text for preview
  const headingSample = 'The quick brown fox';
  const bodySample =
    'The quick brown fox jumps over the lazy dog. This is a sample of body text to demonstrate the font styling and readability.';
  const shortBodySample = 'The quick brown fox jumps over the lazy dog.';

  if (mode === 'compact') {
    return (
      <div
        className={`space-y-3 ${className}`}
        role="group"
        aria-label="Typography preview"
      >
        {/* Font info row */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Heading:
            </span>{' '}
            <span className="font-mono">{headingFont}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Body:
            </span>{' '}
            <span className="font-mono">{bodyFont}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Base:
            </span>{' '}
            <span className="font-mono">{baseFontSize}px</span>
          </div>
        </div>

        {/* Sample text previews */}
        <div className="space-y-2">
          {/* Heading sample */}
          <p
            className="text-gray-900 dark:text-gray-100 font-semibold truncate"
            style={{
              fontFamily: `"${headingFont}", var(--brand-font-heading, system-ui), sans-serif`,
              fontSize: formatFontSize(calculateFontSize(baseFontSize, headingScale, 3)),
            }}
            aria-label={`Heading font sample: ${headingFont}`}
          >
            {headingSample}
          </p>

          {/* Body sample */}
          <p
            className="text-gray-700 dark:text-gray-300 line-clamp-2"
            style={{
              fontFamily: `"${bodyFont}", var(--brand-font-body, system-ui), sans-serif`,
              fontSize: `${baseFontSize}px`,
            }}
            aria-label={`Body font sample: ${bodyFont}`}
          >
            {shortBodySample}
          </p>
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`space-y-6 ${className}`}
      role="group"
      aria-label="Typography preview with full type scale"
    >
      {/* Typography settings overview */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        role="region"
        aria-label="Typography settings"
      >
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Heading Font
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {headingFont}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Body Font
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {bodyFont}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Base Size
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {baseFontSize}px
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Scale
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {getScaleName(headingScale)}
          </dd>
        </div>
      </div>

      {/* Heading type scale */}
      <div className="space-y-4" role="region" aria-label="Heading type scale">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Type Scale
        </h3>
        <div className="space-y-3 divide-y divide-gray-100 dark:divide-gray-700/50">
          {HEADING_LEVELS.map((heading) => {
            const fontSize = calculateFontSize(
              baseFontSize,
              headingScale,
              heading.scaleExponent
            );

            return (
              <div
                key={heading.level}
                className="flex items-baseline gap-4 pt-3 first:pt-0"
              >
                {/* Level label and size */}
                <div className="flex-shrink-0 w-24 text-right">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {heading.level}
                  </span>
                  <span className="ml-2 text-xs font-mono text-gray-400 dark:text-gray-500">
                    {formatFontSize(fontSize)}
                  </span>
                </div>

                {/* Sample text */}
                <p
                  className="flex-1 text-gray-900 dark:text-gray-100 font-semibold truncate"
                  style={{
                    fontFamily: `"${headingFont}", var(--brand-font-heading, system-ui), sans-serif`,
                    fontSize: formatFontSize(fontSize),
                    lineHeight: 1.2,
                  }}
                  aria-label={`${heading.label} at ${formatFontSize(fontSize)}`}
                >
                  {headingSample}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body text preview */}
      <div className="space-y-3" role="region" aria-label="Body text preview">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Body Text
          </h3>
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
            {baseFontSize}px
          </span>
        </div>
        <p
          className="text-gray-700 dark:text-gray-300 leading-relaxed"
          style={{
            fontFamily: `"${bodyFont}", var(--brand-font-body, system-ui), sans-serif`,
            fontSize: `${baseFontSize}px`,
          }}
          aria-label={`Body text sample in ${bodyFont}`}
        >
          {bodySample}
        </p>
      </div>

      {/* Custom fonts note */}
      {typography.customFonts && typography.customFonts.length > 0 && (
        <div
          className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800/50 rounded"
          role="note"
          aria-label="Custom fonts included"
        >
          <span className="font-medium">Custom fonts:</span>{' '}
          {typography.customFonts.join(', ')}
        </div>
      )}
    </div>
  );
}

export default TypographyPreview;
