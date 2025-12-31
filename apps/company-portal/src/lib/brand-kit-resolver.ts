/**
 * Brand Kit Resolver
 *
 * Resolves brand kit settings with proper fallback hierarchy:
 * 1. Funnel-specific brandKit (highest priority)
 * 2. Company-level brandKit
 * 3. Legacy funnel branding settings
 * 4. Default brand kit (lowest priority)
 */

// ============================================================================
// Types - Re-exported from api.ts for consistency
// ============================================================================

// Import types from api.ts to avoid duplication
import type {
  BrandKit,
  BrandKitLogo,
  BrandKitColors,
  BrandKitTypography,
} from './api';

// Re-export types for consumers of this module
export type { BrandKit, BrandKitLogo, BrandKitColors, BrandKitTypography };

/**
 * Deep partial type for brand kit overrides
 * Allows partial values at all levels (e.g., colors with only secondary set)
 */
export interface BrandKitOverride {
  logos?: Partial<BrandKitLogo>;
  colors?: Partial<BrandKitColors>;
  typography?: Partial<BrandKitTypography>;
  faviconUrl?: string;
  preset?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'custom';
}

/**
 * Legacy branding structure from funnel settings
 * Used for backward compatibility - makes all FunnelBranding fields optional
 */
export interface LegacyBranding {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
}

/**
 * Funnel settings that may contain legacy branding
 * Uses a generic structure to allow flexibility
 */
export type FunnelSettingsWithBranding = {
  branding?: LegacyBranding;
};

/**
 * Funnel structure with optional brand kit and settings
 * Accepts any funnel-like object with optional branding fields
 */
export interface FunnelWithBrandKit {
  id: string;
  brandKit?: BrandKitOverride | null;
  settings?: FunnelSettingsWithBranding | null;
}

// ============================================================================
// Default Brand Kit
// ============================================================================

export const DEFAULT_BRAND_KIT: BrandKit = {
  logos: {},
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
    customFonts: [],
  },
  preset: 'minimal',
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum font size for WCAG accessibility compliance
 * WCAG 2.1 SC 1.4.4 recommends body text be at least 12px
 */
export const MIN_FONT_SIZE = 12;

/**
 * Maximum recommended font size for base text
 * Larger values may cause layout issues
 */
export const MAX_FONT_SIZE = 32;

/**
 * Valid heading scale range
 * Below 1.067 has minimal visual hierarchy
 * Above 1.618 (Golden Ratio) can cause overly large headings
 */
export const MIN_HEADING_SCALE = 1.067;
export const MAX_HEADING_SCALE = 1.618;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge logo objects with override taking precedence
 */
function mergeLogos(
  base: BrandKitLogo,
  override: Partial<BrandKitLogo> | undefined
): BrandKitLogo {
  if (!override) return { ...base };
  return {
    fullUrl: override.fullUrl !== undefined ? override.fullUrl : base.fullUrl,
    iconUrl: override.iconUrl !== undefined ? override.iconUrl : base.iconUrl,
    monochromeUrl: override.monochromeUrl !== undefined ? override.monochromeUrl : base.monochromeUrl,
    reversedUrl: override.reversedUrl !== undefined ? override.reversedUrl : base.reversedUrl,
  };
}

/**
 * Merge color objects with override taking precedence
 */
function mergeColors(
  base: BrandKitColors,
  override: Partial<BrandKitColors> | undefined
): BrandKitColors {
  if (!override) return { ...base };
  return {
    primary: override.primary !== undefined ? override.primary : base.primary,
    secondary: override.secondary !== undefined ? override.secondary : base.secondary,
    accent: override.accent !== undefined ? override.accent : base.accent,
    background: override.background !== undefined ? override.background : base.background,
    text: override.text !== undefined ? override.text : base.text,
    success: override.success !== undefined ? override.success : base.success,
    warning: override.warning !== undefined ? override.warning : base.warning,
    error: override.error !== undefined ? override.error : base.error,
  };
}

/**
 * Merge typography objects with override taking precedence
 * Enforces minimum font size and valid scale ranges for WCAG compliance
 */
function mergeTypography(
  base: BrandKitTypography,
  override: Partial<BrandKitTypography> | undefined
): BrandKitTypography {
  if (!override) return { ...base };

  // Get raw values
  const baseFontSize = override.baseFontSize !== undefined ? override.baseFontSize : base.baseFontSize;
  const headingScale = override.headingScale !== undefined ? override.headingScale : base.headingScale;

  // Enforce constraints
  const constrainedFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, baseFontSize || MIN_FONT_SIZE));
  const constrainedScale = Math.max(MIN_HEADING_SCALE, Math.min(MAX_HEADING_SCALE, headingScale || MIN_HEADING_SCALE));

  return {
    headingFont: override.headingFont !== undefined ? override.headingFont : base.headingFont,
    bodyFont: override.bodyFont !== undefined ? override.bodyFont : base.bodyFont,
    baseFontSize: constrainedFontSize,
    headingScale: constrainedScale,
    customFonts: override.customFonts !== undefined ? override.customFonts : base.customFonts,
  };
}

/**
 * Merge two brand kits, with override values taking precedence
 * Performs deep merge on nested objects (logos, colors, typography)
 */
export function mergeBrandKit(
  base: BrandKit,
  override: BrandKitOverride | undefined | null
): BrandKit {
  if (!override) {
    return { ...base };
  }

  return {
    logos: mergeLogos(base.logos, override.logos),
    colors: mergeColors(base.colors, override.colors),
    typography: mergeTypography(base.typography, override.typography),
    faviconUrl: override.faviconUrl !== undefined ? override.faviconUrl : base.faviconUrl,
    preset: override.preset !== undefined ? override.preset : base.preset,
  };
}

/**
 * Convert legacy branding settings to brand kit format
 */
function convertLegacyBranding(branding: LegacyBranding): Partial<BrandKit> {
  const result: Partial<BrandKit> = {};

  // Convert colors - only set if we have at least one color
  if (branding.primaryColor || branding.secondaryColor) {
    const colors: Partial<BrandKitColors> = {};
    if (branding.primaryColor) {
      colors.primary = branding.primaryColor;
    }
    if (branding.secondaryColor) {
      colors.secondary = branding.secondaryColor;
    }
    result.colors = colors as BrandKitColors;
  }

  // Convert typography
  if (branding.fontFamily) {
    result.typography = {
      headingFont: branding.fontFamily,
      bodyFont: branding.fontFamily,
    };
  }

  // Convert logo
  if (branding.logoUrl) {
    result.logos = {
      fullUrl: branding.logoUrl,
    };
  }

  return result;
}

// ============================================================================
// Main Resolution Function
// ============================================================================

/**
 * Resolve the final brand kit for a funnel with proper fallback hierarchy
 *
 * Priority (highest to lowest):
 * 1. Funnel-specific brandKit
 * 2. Company-level brandKit (if provided)
 * 3. Legacy funnel branding settings (from funnel.settings.branding)
 * 4. Default brand kit
 *
 * @param funnel - The funnel object with optional brandKit and settings
 * @param companyBrandKit - Optional company-level brand kit
 * @returns Fully resolved BrandKit with all required fields
 *
 * @example
 * ```typescript
 * const brandKit = resolveBrandKit(funnel, company?.brandKit);
 * // Use brandKit.colors.primary, brandKit.typography.headingFont, etc.
 * ```
 */
export function resolveBrandKit(
  funnel: FunnelWithBrandKit,
  companyBrandKit?: BrandKitOverride | null
): BrandKit {
  // Start with defaults
  let resolved = { ...DEFAULT_BRAND_KIT };

  // Layer 1: Apply legacy branding (lowest priority after defaults)
  const legacyBranding = funnel.settings?.branding;
  if (legacyBranding) {
    const convertedLegacy = convertLegacyBranding(legacyBranding);
    resolved = mergeBrandKit(resolved, convertedLegacy);
  }

  // Layer 2: Apply company brand kit
  if (companyBrandKit) {
    resolved = mergeBrandKit(resolved, companyBrandKit);
  }

  // Layer 3: Apply funnel brand kit (highest priority)
  if (funnel.brandKit) {
    resolved = mergeBrandKit(resolved, funnel.brandKit);
  }

  return resolved;
}

/**
 * Get CSS custom properties from a resolved brand kit
 * Useful for applying brand kit styles via CSS variables
 *
 * @param brandKit - Resolved brand kit
 * @returns Object with CSS variable names and values
 *
 * @example
 * ```typescript
 * const cssVars = getBrandKitCSSVariables(brandKit);
 * // { '--brand-primary': '#6366f1', '--brand-secondary': '#3b82f6', ... }
 * ```
 */
export function getBrandKitCSSVariables(
  brandKit: BrandKit
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Colors
  vars['--brand-primary'] = brandKit.colors.primary;
  if (brandKit.colors.secondary) {
    vars['--brand-secondary'] = brandKit.colors.secondary;
  }
  if (brandKit.colors.accent) {
    vars['--brand-accent'] = brandKit.colors.accent;
  }
  if (brandKit.colors.background) {
    vars['--brand-background'] = brandKit.colors.background;
  }
  if (brandKit.colors.text) {
    vars['--brand-text'] = brandKit.colors.text;
  }
  if (brandKit.colors.success) {
    vars['--brand-success'] = brandKit.colors.success;
  }
  if (brandKit.colors.warning) {
    vars['--brand-warning'] = brandKit.colors.warning;
  }
  if (brandKit.colors.error) {
    vars['--brand-error'] = brandKit.colors.error;
  }

  // Typography
  if (brandKit.typography.headingFont) {
    vars['--brand-font-heading'] = brandKit.typography.headingFont;
  }
  if (brandKit.typography.bodyFont) {
    vars['--brand-font-body'] = brandKit.typography.bodyFont;
  }
  if (brandKit.typography.baseFontSize) {
    vars['--brand-font-size-base'] = `${brandKit.typography.baseFontSize}px`;
  }
  if (brandKit.typography.headingScale) {
    vars['--brand-heading-scale'] = String(brandKit.typography.headingScale);
  }

  return vars;
}

/**
 * Get Google Fonts URL for custom fonts in the brand kit
 *
 * @param brandKit - Resolved brand kit
 * @returns Google Fonts URL or null if no custom fonts needed
 *
 * @example
 * ```typescript
 * const fontsUrl = getGoogleFontsUrl(brandKit);
 * if (fontsUrl) {
 *   // Add <link href={fontsUrl} rel="stylesheet" /> to head
 * }
 * ```
 */
export function getGoogleFontsUrl(brandKit: BrandKit): string | null {
  const fonts = new Set<string>();

  // Add heading and body fonts if they're not system fonts
  // Use case-insensitive matching for system fonts
  const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia'];
  const systemFontsLower = systemFonts.map((f) => f.toLowerCase());

  const isSystemFont = (font: string): boolean =>
    systemFontsLower.includes(font.toLowerCase());

  if (brandKit.typography.headingFont && !isSystemFont(brandKit.typography.headingFont)) {
    fonts.add(brandKit.typography.headingFont);
  }

  if (brandKit.typography.bodyFont && !isSystemFont(brandKit.typography.bodyFont)) {
    fonts.add(brandKit.typography.bodyFont);
  }

  // Add any custom fonts
  if (brandKit.typography.customFonts) {
    for (const font of brandKit.typography.customFonts) {
      if (!isSystemFont(font)) {
        fonts.add(font);
      }
    }
  }

  if (fonts.size === 0) {
    return null;
  }

  // Build Google Fonts URL
  const fontFamilies = Array.from(fonts)
    .map((font) => `family=${encodeURIComponent(font)}:wght@400;500;600;700`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
}

/**
 * Get the best logo URL for a given context
 *
 * @param logos - Brand kit logos object
 * @param context - The context for logo selection
 * @returns The best logo URL or undefined if none available
 */
export function getLogoUrl(
  logos: BrandKitLogo,
  context: 'full' | 'icon' | 'monochrome' | 'reversed' = 'full'
): string | undefined {
  // Try to get the requested logo type first
  switch (context) {
    case 'icon':
      return logos.iconUrl || logos.fullUrl;
    case 'monochrome':
      return logos.monochromeUrl || logos.fullUrl;
    case 'reversed':
      return logos.reversedUrl || logos.fullUrl;
    case 'full':
    default:
      return logos.fullUrl || logos.iconUrl;
  }
}
