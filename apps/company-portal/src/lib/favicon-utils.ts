/**
 * Favicon Utility Functions
 *
 * Provides functions for resolving favicon URLs from brand kit
 * with proper fallback hierarchy.
 */

import type { Funnel, BrandKit } from './api';
import { resolveBrandKit } from './brand-kit-resolver';

/**
 * Get favicon URL from a funnel's resolved brand kit
 *
 * Priority order:
 * 1. faviconUrl (explicit favicon)
 * 2. iconUrl (icon variant of logo - typically square)
 * 3. fullUrl (full logo as last resort)
 *
 * Note: Empty strings are treated as missing values and fall through
 * to the next priority level.
 *
 * @param funnel - The funnel object with optional brandKit and company
 * @returns Favicon URL or undefined if none available
 *
 * @example
 * ```typescript
 * const faviconUrl = getFaviconFromFunnel(funnel);
 * if (faviconUrl) {
 *   // Use for metadata icons
 * }
 * ```
 */
export function getFaviconFromFunnel(funnel: Funnel): string | undefined {
  const brandKit = resolveBrandKit(funnel, funnel.company?.settings?.brandKit as Partial<BrandKit> | undefined);

  // Priority: faviconUrl > iconUrl > fullUrl (logo as fallback)
  if (brandKit.faviconUrl) {
    return brandKit.faviconUrl;
  }
  if (brandKit.logos.iconUrl) {
    return brandKit.logos.iconUrl;
  }
  if (brandKit.logos.fullUrl) {
    return brandKit.logos.fullUrl;
  }
  return undefined;
}

/**
 * Validate that a URL is well-formed for use as a favicon
 *
 * @param url - URL to validate
 * @returns True if the URL is valid for favicon use
 */
export function isValidFaviconUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Allow absolute URLs and relative paths
  if (url.startsWith('/')) {
    return true;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
