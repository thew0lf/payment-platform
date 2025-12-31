import { BrandKit } from '@/lib/api';
import { getGoogleFontsUrl } from '@/lib/brand-kit-resolver';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the FontLoader component
 */
export interface FontLoaderProps {
  /**
   * Brand kit containing typography configuration
   */
  brandKit: BrandKit;
  /**
   * Render fonts as a preconnect link for performance optimization.
   * When true, also renders a preconnect link to fonts.gstatic.com
   * for faster font file downloads.
   * @default false
   */
  preconnect?: boolean;
}

/**
 * Return type for the useFontUrl hook
 */
export interface UseFontUrlResult {
  /**
   * The generated Google Fonts URL, or null if no custom fonts are needed
   */
  fontUrl: string | null;
  /**
   * Whether custom fonts are required (not all system fonts)
   */
  hasCustomFonts: boolean;
}

// ============================================================================
// Utility Function
// ============================================================================

/**
 * Calculates the font URL from a brand kit.
 *
 * This is a pure function that can be used in both Server and Client components.
 * For Client Components that need memoization, wrap with useMemo.
 *
 * @param brandKit - The brand kit containing typography settings
 * @returns Object with fontUrl and hasCustomFonts flag
 *
 * @example
 * ```tsx
 * // In a Server Component
 * const { fontUrl, hasCustomFonts } = getFontUrlFromBrandKit(brandKit);
 *
 * // In a Client Component with memoization
 * const result = useMemo(() => getFontUrlFromBrandKit(brandKit), [brandKit]);
 * ```
 */
export function getFontUrlFromBrandKit(brandKit: BrandKit): UseFontUrlResult {
  const fontUrl = getGoogleFontsUrl(brandKit);
  return {
    fontUrl,
    hasCustomFonts: fontUrl !== null,
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FontLoader - Loads custom fonts from Google Fonts based on brand kit typography.
 *
 * This component renders the necessary `<link>` elements to load custom fonts
 * from Google Fonts. It automatically detects which fonts need to be loaded
 * based on the brand kit's typography settings, skipping system fonts.
 *
 * **Server Component Compatible:**
 * This component is designed to work as a React Server Component (RSC).
 * It does not use any client-side hooks or state, making it safe to use
 * in Next.js App Router layouts and pages without the 'use client' directive.
 *
 * **Performance Considerations:**
 * - Uses `display=swap` for optimal font loading behavior (shows fallback immediately)
 * - Optional preconnect links can improve initial load time
 * - System fonts are automatically detected and skipped
 *
 * **Supported System Fonts (not loaded from Google):**
 * - system-ui, sans-serif, serif, monospace
 * - Arial, Helvetica, Times New Roman, Georgia
 *
 * **Usage Context:**
 * This component can be used in both Server Components and Client Components.
 * Place it in your layout or page component to ensure fonts are loaded before
 * the page content renders.
 *
 * @example Basic usage in a layout
 * ```tsx
 * import { FontLoader } from '@/components/brand/FontLoader';
 *
 * export default function FunnelLayout({ brandKit, children }) {
 *   return (
 *     <>
 *       <FontLoader brandKit={brandKit} />
 *       {children}
 *     </>
 *   );
 * }
 * ```
 *
 * @example With preconnect for performance optimization
 * ```tsx
 * <FontLoader brandKit={brandKit} preconnect />
 * ```
 *
 * @example Conditional rendering based on custom fonts
 * ```tsx
 * function FunnelPage({ brandKit }) {
 *   const { hasCustomFonts } = getFontUrlFromBrandKit(brandKit);
 *
 *   return (
 *     <>
 *       <FontLoader brandKit={brandKit} preconnect={hasCustomFonts} />
 *       <main style={{ fontFamily: brandKit.typography.bodyFont }}>
 *         Content with custom fonts
 *       </main>
 *     </>
 *   );
 * }
 * ```
 *
 * @example In a Server Component (Next.js App Router)
 * ```tsx
 * // app/f/[slug]/layout.tsx
 * import { FontLoader } from '@/components/brand/FontLoader';
 *
 * export default async function FunnelLayout({ params }) {
 *   const funnel = await getFunnel(params.slug);
 *   const brandKit = resolveBrandKit(funnel);
 *
 *   return (
 *     <html>
 *       <head>
 *         <FontLoader brandKit={brandKit} preconnect />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example With memoization in a Client Component
 * ```tsx
 * 'use client';
 *
 * import { useMemo } from 'react';
 * import { FontLoader, getFontUrlFromBrandKit } from '@/components/brand/FontLoader';
 *
 * function ClientFunnelRenderer({ brandKit }) {
 *   // Memoize the font URL calculation for performance
 *   const { hasCustomFonts } = useMemo(
 *     () => getFontUrlFromBrandKit(brandKit),
 *     [brandKit]
 *   );
 *
 *   return (
 *     <>
 *       <FontLoader brandKit={brandKit} preconnect={hasCustomFonts} />
 *       <div>Funnel content...</div>
 *     </>
 *   );
 * }
 * ```
 */
export function FontLoader({ brandKit, preconnect = false }: FontLoaderProps) {
  const { fontUrl, hasCustomFonts } = getFontUrlFromBrandKit(brandKit);

  // No custom fonts needed - render nothing
  if (!hasCustomFonts || !fontUrl) {
    return null;
  }

  return (
    <>
      {/* Preconnect links for performance - reduces connection time */}
      {preconnect && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
        </>
      )}

      {/* Google Fonts stylesheet */}
      <link rel="stylesheet" href={fontUrl} />
    </>
  );
}

// Default export for convenient importing
export default FontLoader;
