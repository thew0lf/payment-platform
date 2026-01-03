'use client';

import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

interface CTAContent {
  headline: string;
  subheadline?: string;
  primaryCtaText?: string;
  primaryCtaUrl?: string;
  primaryCtaAction?: 'scroll' | 'link' | 'cart';
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  layout?: 'centered' | 'split' | 'banner';
  backgroundImage?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

interface CTAStyles {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface CTASectionProps {
  content: CTAContent | Record<string, unknown>;
  styles?: CTAStyles;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CTASection - Call to action section with headline and buttons
 *
 * Supports:
 * - Centered, split, and banner layouts
 * - Primary and secondary CTA buttons
 * - Background images with overlay
 * - Scroll, link, or cart actions
 */
export function CTASection({ content, styles }: CTASectionProps) {
  const { scrollToSection, openCartDrawer, cartCount } = useLandingPage();

  const ctaContent = content as CTAContent;
  const {
    headline,
    subheadline,
    primaryCtaText,
    primaryCtaUrl,
    primaryCtaAction = 'link',
    secondaryCtaText,
    secondaryCtaUrl,
    layout = 'centered',
    backgroundImage,
    overlay = true,
    overlayOpacity = 0.6,
  } = ctaContent;

  const handlePrimaryClick = () => {
    if (primaryCtaAction === 'cart') {
      openCartDrawer();
    } else if (primaryCtaAction === 'scroll') {
      scrollToSection(0); // Scroll to top or specific section
    } else if (primaryCtaUrl) {
      window.location.href = primaryCtaUrl;
    }
  };

  const handleSecondaryClick = () => {
    if (secondaryCtaUrl) {
      window.location.href = secondaryCtaUrl;
    }
  };

  // Determine if we should use light or dark text based on background
  const hasBackground = backgroundImage || styles?.backgroundColor;
  const textColorClass = hasBackground ? 'text-white' : '';

  return (
    <div
      className="relative py-16 sm:py-24 overflow-hidden"
      style={{
        backgroundColor: styles?.backgroundColor || 'var(--lp-primary)',
      }}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          aria-hidden="true"
        />
      )}

      {/* Overlay */}
      {backgroundImage && overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered layout */}
        {layout === 'centered' && (
          <div className="text-center">
            <h2
              className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${textColorClass}`}
              style={{
                color: styles?.textColor || '#ffffff',
                fontFamily: 'var(--lp-heading-font), system-ui, sans-serif',
              }}
            >
              {headline}
            </h2>

            {subheadline && (
              <p
                className={`text-lg sm:text-xl mb-8 max-w-2xl mx-auto opacity-90 ${textColorClass}`}
                style={{ color: styles?.textColor || '#ffffff' }}
              >
                {subheadline}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {primaryCtaText && (
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  className="
                    inline-flex items-center gap-2
                    px-8 py-4 min-h-[52px]
                    bg-white text-gray-900
                    font-semibold text-lg
                    rounded-full shadow-lg
                    hover:bg-gray-100 hover:scale-105
                    transition-all duration-200
                    touch-manipulation active:scale-[0.98]
                  "
                >
                  {primaryCtaText}
                  {primaryCtaAction === 'cart' && cartCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-[var(--lp-primary)] text-white text-sm rounded-full">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {secondaryCtaText && (
                <button
                  type="button"
                  onClick={handleSecondaryClick}
                  className="
                    inline-flex items-center gap-2
                    px-8 py-4 min-h-[52px]
                    bg-transparent
                    font-semibold text-lg
                    rounded-full
                    border-2 border-white border-opacity-50
                    hover:bg-white hover:bg-opacity-10
                    transition-all duration-200
                    touch-manipulation active:scale-[0.98]
                  "
                  style={{ color: styles?.textColor || '#ffffff' }}
                >
                  {secondaryCtaText}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Split layout */}
        {layout === 'split' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="lg:max-w-xl">
              <h2
                className={`text-3xl sm:text-4xl font-bold mb-4 ${textColorClass}`}
                style={{
                  color: styles?.textColor || '#ffffff',
                  fontFamily: 'var(--lp-heading-font), system-ui, sans-serif',
                }}
              >
                {headline}
              </h2>

              {subheadline && (
                <p
                  className={`text-lg opacity-90 ${textColorClass}`}
                  style={{ color: styles?.textColor || '#ffffff' }}
                >
                  {subheadline}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {primaryCtaText && (
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  className="
                    inline-flex items-center gap-2
                    px-8 py-4 min-h-[52px]
                    bg-white text-gray-900
                    font-semibold text-lg
                    rounded-full shadow-lg
                    hover:bg-gray-100 hover:scale-105
                    transition-all duration-200
                    touch-manipulation active:scale-[0.98]
                  "
                >
                  {primaryCtaText}
                </button>
              )}

              {secondaryCtaText && (
                <button
                  type="button"
                  onClick={handleSecondaryClick}
                  className="
                    inline-flex items-center gap-2
                    px-8 py-4 min-h-[52px]
                    bg-transparent
                    font-semibold text-lg
                    rounded-full
                    border-2 border-white border-opacity-50
                    hover:bg-white hover:bg-opacity-10
                    transition-all duration-200
                    touch-manipulation active:scale-[0.98]
                  "
                  style={{ color: styles?.textColor || '#ffffff' }}
                >
                  {secondaryCtaText}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Banner layout */}
        {layout === 'banner' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <h2
                className={`text-xl sm:text-2xl font-bold ${textColorClass}`}
                style={{
                  color: styles?.textColor || '#ffffff',
                  fontFamily: 'var(--lp-heading-font), system-ui, sans-serif',
                }}
              >
                {headline}
              </h2>

              {subheadline && (
                <p
                  className={`hidden sm:block text-sm opacity-90 ${textColorClass}`}
                  style={{ color: styles?.textColor || '#ffffff' }}
                >
                  {subheadline}
                </p>
              )}
            </div>

            {primaryCtaText && (
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="
                  inline-flex items-center gap-2
                  px-6 py-3 min-h-[44px]
                  bg-white text-gray-900
                  font-semibold
                  rounded-full shadow-lg
                  hover:bg-gray-100 hover:scale-105
                  transition-all duration-200
                  touch-manipulation active:scale-[0.98]
                "
              >
                {primaryCtaText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CTASection;
