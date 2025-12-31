'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BrandKit } from '@/lib/api';
import { getLogoUrl } from '@/lib/brand-kit-resolver';

// ============================================================================
// Types
// ============================================================================

export type LogoContext = 'full' | 'icon' | 'monochrome' | 'reversed';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface LogoDisplayProps {
  /** Brand kit containing logo URLs */
  brandKit: BrandKit;
  /** Logo context/type to display */
  context?: LogoContext;
  /** Size preset for the logo */
  size?: LogoSize;
  /** Additional CSS classes */
  className?: string;
  /** Company name for alt text fallback */
  companyName?: string;
}

// ============================================================================
// Size Configuration
// ============================================================================

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

// ============================================================================
// Placeholder Component
// ============================================================================

interface PlaceholderProps {
  size: number;
  companyName?: string;
  className?: string;
}

function LogoPlaceholder({ size, companyName, className = '' }: PlaceholderProps) {
  // Get first letter of company name or use a generic icon
  const initial = companyName?.charAt(0).toUpperCase() || 'C';

  // Calculate font size based on container size
  const fontSize = Math.round(size * 0.4);

  return (
    <div
      className={`flex items-center justify-center rounded-md bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: `${fontSize}px`,
      }}
      role="img"
      aria-label={companyName ? `${companyName} logo placeholder` : 'Company logo placeholder'}
    >
      {initial}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LogoDisplay - Displays brand kit logo with fallback handling
 *
 * @example
 * ```tsx
 * <LogoDisplay brandKit={brandKit} context="full" size="lg" />
 * <LogoDisplay brandKit={brandKit} context="icon" size="sm" companyName="Acme Inc" />
 * ```
 */
export function LogoDisplay({
  brandKit,
  context = 'full',
  size = 'md',
  className = '',
  companyName,
}: LogoDisplayProps) {
  // Track image load error state using React state (not DOM manipulation)
  const [hasImageError, setHasImageError] = useState(false);

  const pixelSize = SIZE_MAP[size];
  const logoUrl = brandKit?.logos ? getLogoUrl(brandKit.logos, context) : undefined;

  // Generate alt text
  const altText = companyName ? `${companyName} Logo` : 'Company Logo';

  // Show placeholder if no logo URL available or if image failed to load
  if (!logoUrl || hasImageError) {
    return (
      <LogoPlaceholder
        size={pixelSize}
        companyName={companyName}
        className={className}
      />
    );
  }

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
      }}
    >
      <Image
        src={logoUrl}
        alt={altText}
        fill
        sizes={`${pixelSize}px`}
        className="object-contain"
        loading="lazy"
        onError={() => {
          // Use React state to trigger re-render with placeholder
          // This is the proper React pattern (not DOM manipulation)
          setHasImageError(true);
        }}
      />
    </div>
  );
}

// Default export for convenient importing
export default LogoDisplay;
