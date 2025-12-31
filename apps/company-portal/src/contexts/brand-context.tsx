'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { Funnel, BrandKit } from '@/lib/api';
import {
  resolveBrandKit,
  getBrandKitCSSVariables,
  getLogoUrl,
  getGoogleFontsUrl,
  FunnelWithBrandKit,
} from '@/lib/brand-kit-resolver';

// ============================================================================
// Types
// ============================================================================

interface BrandContextValue {
  /** The fully resolved brand kit with all fallbacks applied */
  brandKit: BrandKit;
  /** Primary logo URL (full logo, falling back to icon) */
  logoUrl: string | undefined;
  /** Icon logo URL (icon, falling back to full) */
  iconLogoUrl: string | undefined;
  /** Monochrome logo URL */
  monochromeLogoUrl: string | undefined;
  /** Reversed (light) logo URL for dark backgrounds */
  reversedLogoUrl: string | undefined;
  /** Favicon URL */
  faviconUrl: string | undefined;
  /** CSS variables object for inline styles */
  cssVariables: Record<string, string>;
  /** Google Fonts URL for loading custom fonts, or null if not needed */
  googleFontsUrl: string | null;
  /** Inline font-family styles for heading and body */
  fontStyles: {
    heading: React.CSSProperties;
    body: React.CSSProperties;
  };
}

interface BrandProviderProps {
  /** The funnel containing brand kit configuration */
  funnel: Funnel;
  /** Child components to render */
  children: React.ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const BrandContext = createContext<BrandContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * BrandProvider - Provides resolved brand kit to all child components
 *
 * Resolves brand kit settings with proper fallback hierarchy:
 * 1. Funnel-specific brandKit (highest priority)
 * 2. Company-level brandKit (from funnel.company.settings.brandKit)
 * 3. Legacy funnel branding settings (from funnel.settings.branding)
 * 4. Default brand kit (lowest priority)
 *
 * @example
 * ```tsx
 * <BrandProvider funnel={funnel}>
 *   <FunnelStages />
 * </BrandProvider>
 * ```
 */
export function BrandProvider({ funnel, children }: BrandProviderProps) {
  // Extract company brand kit from funnel
  const companyBrandKit = funnel.company?.settings?.brandKit;

  // Memoize the resolved brand kit to avoid unnecessary recalculations
  const brandKit = useMemo(() => {
    // Convert Funnel to FunnelWithBrandKit for resolveBrandKit
    const funnelWithBrandKit: FunnelWithBrandKit = {
      id: funnel.id,
      brandKit: funnel.brandKit,
      settings: funnel.settings?.branding ? { branding: funnel.settings.branding } : undefined,
    };
    return resolveBrandKit(funnelWithBrandKit, companyBrandKit);
  }, [funnel, companyBrandKit]);

  // Memoize CSS variables
  const cssVariables = useMemo(() => {
    return getBrandKitCSSVariables(brandKit);
  }, [brandKit]);

  // Memoize logo URLs
  const logoUrl = useMemo(() => getLogoUrl(brandKit.logos, 'full'), [brandKit.logos]);
  const iconLogoUrl = useMemo(() => getLogoUrl(brandKit.logos, 'icon'), [brandKit.logos]);
  const monochromeLogoUrl = useMemo(() => getLogoUrl(brandKit.logos, 'monochrome'), [brandKit.logos]);
  const reversedLogoUrl = useMemo(() => getLogoUrl(brandKit.logos, 'reversed'), [brandKit.logos]);

  // Memoize Google Fonts URL
  const googleFontsUrl = useMemo(() => getGoogleFontsUrl(brandKit), [brandKit]);

  // Memoize font styles for inline application
  const fontStyles = useMemo(() => {
    const { headingFont, bodyFont } = brandKit.typography;
    return {
      heading: {
        fontFamily: headingFont ? `"${headingFont}", sans-serif` : 'inherit',
      } as React.CSSProperties,
      body: {
        fontFamily: bodyFont ? `"${bodyFont}", sans-serif` : 'inherit',
      } as React.CSSProperties,
    };
  }, [brandKit.typography]);

  // Memoize the context value
  const value = useMemo<BrandContextValue>(
    () => ({
      brandKit,
      logoUrl,
      iconLogoUrl,
      monochromeLogoUrl,
      reversedLogoUrl,
      faviconUrl: brandKit.faviconUrl,
      cssVariables,
      googleFontsUrl,
      fontStyles,
    }),
    [brandKit, logoUrl, iconLogoUrl, monochromeLogoUrl, reversedLogoUrl, cssVariables, googleFontsUrl, fontStyles]
  );

  return (
    <BrandContext.Provider value={value}>
      <div className="brand-provider" style={cssVariables}>
        {children}
      </div>
    </BrandContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useBrand - Hook to access the brand kit context
 *
 * Must be used within a BrandProvider component.
 *
 * @returns BrandContextValue containing the resolved brand kit and helper values
 * @throws Error if used outside of BrandProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { brandKit, logoUrl, cssVariables } = useBrand();
 *
 *   return (
 *     <div style={{ color: brandKit.colors.primary }}>
 *       {logoUrl && <img src={logoUrl} alt="Logo" />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}

// ============================================================================
// Default Export
// ============================================================================

export default BrandProvider;
