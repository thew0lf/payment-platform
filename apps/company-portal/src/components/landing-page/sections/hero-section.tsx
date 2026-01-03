'use client';

import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

interface HeroContent {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaAction?: 'scroll' | 'link' | 'next-section';
  backgroundImage?: string;
  backgroundVideo?: string;
  alignment?: 'left' | 'center' | 'right';
  overlay?: boolean;
  overlayOpacity?: number;
}

interface HeroStyles {
  backgroundColor?: string;
  textColor?: string;
  minHeight?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface HeroSectionProps {
  content: HeroContent | Record<string, unknown>;
  styles?: HeroStyles;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * HeroSection - Landing page hero with headline, subheadline, and CTA
 *
 * Supports:
 * - Background images and videos
 * - Customizable text alignment
 * - Dark overlay for better text readability
 * - Animated CTA button with scroll/link actions
 */
export function HeroSection({ content, styles }: HeroSectionProps) {
  const { scrollToSection } = useLandingPage();

  // Cast content to HeroContent type with safe defaults
  const heroContent = content as HeroContent;
  const {
    headline = 'Welcome',
    subheadline,
    ctaText,
    ctaUrl,
    ctaAction = 'scroll',
    backgroundImage,
    backgroundVideo,
    alignment = 'center',
    overlay = true,
    overlayOpacity = 0.5,
  } = heroContent;

  const handleCtaClick = () => {
    if (ctaAction === 'link' && ctaUrl) {
      window.location.href = ctaUrl;
    } else if (ctaAction === 'scroll' || ctaAction === 'next-section') {
      // Scroll to the next section
      scrollToSection(1);
    }
  };

  // Alignment classes
  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        minHeight: styles?.minHeight || '80vh',
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

      {/* Background Video */}
      {backgroundVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      )}

      {/* Overlay */}
      {(backgroundImage || backgroundVideo) && overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div
        className={`relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col ${alignmentClasses[alignment]}`}
      >
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          style={{
            color: styles?.textColor || '#ffffff',
            fontFamily: 'var(--lp-heading-font), system-ui, sans-serif',
          }}
        >
          {headline}
        </h1>

        {subheadline && (
          <p
            className="text-lg sm:text-xl lg:text-2xl mb-8 max-w-2xl opacity-90"
            style={{ color: styles?.textColor || '#ffffff' }}
          >
            {subheadline}
          </p>
        )}

        {ctaText && (
          <button
            type="button"
            onClick={handleCtaClick}
            className="
              inline-flex items-center gap-2
              px-8 py-4 min-h-[52px]
              bg-white text-gray-900
              font-semibold text-lg
              rounded-full shadow-lg
              hover:bg-gray-100 hover:scale-105
              transition-all duration-200
              touch-manipulation active:scale-[0.98]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2
            "
          >
            {ctaText}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-white opacity-60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </div>
  );
}

export default HeroSection;
