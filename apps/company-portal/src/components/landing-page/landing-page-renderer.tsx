'use client';

import { useEffect, useState } from 'react';
import {
  useLandingPage,
  LandingPageProvider,
  type LandingPageSection,
  type LandingPageSectionType,
} from '@/contexts/landing-page-context';
import { HeroSection } from './sections/hero-section';
import { FeaturesSection } from './sections/features-section';
import { TestimonialsSection } from './sections/testimonials-section';
import { ProductSelectionSection } from './sections/product-selection-section';
import { FAQSection } from './sections/faq-section';
import { CTASection } from './sections/cta-section';
import { CustomSection } from './sections/custom-section';
import { LandingPageCartDrawer } from './landing-page-cart-drawer';
import { LandingPageMiniCart } from './landing-page-mini-cart';
import { LandingPageFloatingCart } from './landing-page-floating-cart';
import { LandingPageStickyCartBar } from './landing-page-sticky-cart-bar';

// ============================================================================
// Types
// ============================================================================

interface LandingPageRendererProps {
  /** The slug identifier for the landing page */
  slug: string;
}

// ============================================================================
// Loading Spinner Component
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div
          className="w-12 h-12 border-4 border-[var(--lp-primary,#667eea)] border-t-transparent rounded-full animate-spin mx-auto"
          role="status"
          aria-label="Loading"
        />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Error Message Component
// ============================================================================

interface ErrorMessageProps {
  message: string;
}

function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 min-h-[44px] bg-[var(--lp-primary,#667eea)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity touch-manipulation active:scale-[0.98]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Section Renderer
// ============================================================================

interface SectionRendererProps {
  section: LandingPageSection;
}

/**
 * Normalize section type to uppercase for consistent matching
 */
function normalizeType(type: LandingPageSectionType): string {
  return type.toUpperCase();
}

/**
 * Get section content, supporting both 'content' and legacy 'config' fields
 */
function getSectionContent(section: LandingPageSection): Record<string, unknown> {
  return section.content || section.config || {};
}

function SectionRenderer({ section }: SectionRendererProps) {
  // Apply section-level styles if provided
  const sectionStyles: React.CSSProperties = {
    ...(section.styles?.backgroundColor && {
      backgroundColor: section.styles.backgroundColor,
    }),
    ...(section.styles?.paddingTop && { paddingTop: section.styles.paddingTop }),
    ...(section.styles?.paddingBottom && {
      paddingBottom: section.styles.paddingBottom,
    }),
  };

  const wrapSection = (children: React.ReactNode) => (
    <section
      id={section.id}
      style={sectionStyles}
      className="relative"
      data-section-type={section.type}
    >
      {children}
    </section>
  );

  const content = getSectionContent(section);
  const normalizedType = normalizeType(section.type);

  switch (normalizedType) {
    case 'HERO':
      return wrapSection(
        <HeroSection content={content} styles={section.styles} />
      );
    case 'FEATURES':
      return wrapSection(
        <FeaturesSection content={content} styles={section.styles} />
      );
    case 'TESTIMONIALS':
      return wrapSection(
        <TestimonialsSection content={content} styles={section.styles} />
      );
    case 'PRODUCT_SELECTION':
    case 'PRODUCTS':
      return wrapSection(
        <ProductSelectionSection
          content={content}
          styles={section.styles}
        />
      );
    case 'FAQ':
      return wrapSection(
        <FAQSection content={content} styles={section.styles} />
      );
    case 'CTA':
      return wrapSection(
        <CTASection content={content} styles={section.styles} />
      );
    case 'CUSTOM':
    case 'GALLERY':
      return wrapSection(
        <CustomSection content={content} styles={section.styles} />
      );
    default:
      // Handle unknown section types gracefully
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unknown section type: ${section.type}`);
      }
      return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageRenderer - Renders a dynamic landing page based on its configuration
 *
 * This component:
 * 1. Initializes the landing page via context
 * 2. Renders sections dynamically based on section type
 * 3. Includes a floating cart button and drawer integration
 * 4. Applies custom color schemes from the landing page configuration
 *
 * @example
 * ```tsx
 * <LandingPageRenderer slug="my-landing-page" />
 * ```
 */
export function LandingPageRenderer({ slug }: LandingPageRendererProps) {
  const {
    landingPage,
    isLoading,
    error,
    initializeLandingPage,
  } = useLandingPage();

  // Track initialization to prevent duplicate calls
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized && slug) {
      setIsInitialized(true);
      initializeLandingPage(slug);
    }
  }, [slug, isInitialized, initializeLandingPage]);

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return <ErrorMessage message={error} />;
  }

  // Return null while waiting for landing page data
  if (!landingPage) {
    return null;
  }

  // Build CSS custom properties for theming
  const cssVariables = {
    '--lp-primary': landingPage.colorScheme?.primary || '#667eea',
    '--lp-secondary': landingPage.colorScheme?.secondary || '#764ba2',
    '--lp-accent': landingPage.colorScheme?.accent || '#f59e0b',
    '--lp-background': landingPage.colorScheme?.background || '#ffffff',
    '--lp-text': landingPage.colorScheme?.text || '#1f2937',
    '--lp-heading-font': landingPage.typography?.headingFont || 'system-ui',
    '--lp-body-font': landingPage.typography?.bodyFont || 'system-ui',
  } as React.CSSProperties;

  // Filter and sort sections
  const visibleSections = landingPage.sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="min-h-screen"
      style={{
        ...cssVariables,
        backgroundColor: 'var(--lp-background)',
        color: 'var(--lp-text)',
        fontFamily: `var(--lp-body-font), system-ui, sans-serif`,
      }}
    >
      {/* Fixed header with mini cart */}
      <header className="fixed top-0 right-0 p-4 z-40">
        <LandingPageMiniCart />
      </header>

      {/* Landing page header with logo if provided */}
      {landingPage.logoUrl && (
        <div className="absolute top-0 left-0 p-4 z-40">
          <img
            src={landingPage.logoUrl}
            alt={landingPage.name || 'Logo'}
            className="h-10 w-auto object-contain"
          />
        </div>
      )}

      {/* Main content - sections */}
      <main>
        {visibleSections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </main>

      {/* Footer */}
      {(landingPage.termsUrl || landingPage.privacyUrl) && (
        <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              {landingPage.termsUrl && (
                <a
                  href={landingPage.termsUrl}
                  className="hover:text-gray-700 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
              )}
              {landingPage.privacyUrl && (
                <a
                  href={landingPage.privacyUrl}
                  className="hover:text-gray-700 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              )}
            </div>
          </div>
        </footer>
      )}

      {/* Cart drawer */}
      <LandingPageCartDrawer />

      {/* Desktop floating cart summary */}
      <LandingPageFloatingCart />

      {/* Mobile sticky cart bar */}
      <LandingPageStickyCartBar />
    </div>
  );
}

export default LandingPageRenderer;
