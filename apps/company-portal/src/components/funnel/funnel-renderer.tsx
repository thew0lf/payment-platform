'use client';

import { useEffect } from 'react';
import { Funnel } from '@/lib/api';
import { FunnelProvider, useFunnel } from '@/contexts/funnel-context';
import { BrandProvider, useBrand } from '@/contexts/brand-context';
import { InterventionProvider, UrgencyBanner } from '@/components/interventions';
import { LandingStage } from './stages/landing-stage';
import { ProductSelectionStage } from './stages/product-selection-stage';
import { CheckoutStage } from './stages/checkout-stage';
import { SuccessStage } from './stages/success-stage';
import { ProgressBar } from './progress-bar';
import { CartSummary } from './cart-summary';
import { LogoDisplay } from '@/components/brand/LogoDisplay';
import { FontLoader } from '@/components/brand/FontLoader';
import { DemoBadge } from '@/components/demo';
import { useFunnelUrlSync } from '@/hooks/use-funnel-url-sync';
import { CSWidget } from '@/components/cs';

interface FunnelRendererProps {
  funnel: Funnel;
}

export function FunnelRenderer({ funnel }: FunnelRendererProps) {
  return (
    <BrandProvider funnel={funnel}>
      <FunnelProvider>
        <FunnelContent funnel={funnel} />
      </FunnelProvider>
    </BrandProvider>
  );
}

function FunnelContent({ funnel }: FunnelRendererProps) {
  const {
    initializeFunnel,
    currentStage,
    currentStageIndex,
    goToStage,
    isLoading,
    error,
    progress,
    session,
    cart,
    isDemoMode,
  } = useFunnel();

  // Get resolved brand kit and CSS variables from context
  const { brandKit, cssVariables } = useBrand();

  // Sync funnel stage with URL for browser navigation support
  // This enables back/forward buttons and page refresh to maintain state
  useFunnelUrlSync({
    funnel: session ? funnel : null, // Only sync after session is initialized
    currentStageIndex,
    goToStage,
    isInitialized: !isLoading && !!session,
  });

  useEffect(() => {
    initializeFunnel(funnel);
  }, [funnel, initializeFunnel]);

  // Use CSS variables from BrandProvider context
  // Also include legacy --primary-color/--secondary-color for backward compatibility
  const brandStyles = {
    ...cssVariables,
    '--primary-color': brandKit.colors.primary,
    '--secondary-color': brandKit.colors.secondary || '#3b82f6',
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" style={brandStyles}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" style={brandStyles}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Session completed - show success
  if (session?.status === 'COMPLETED') {
    return (
      <div style={brandStyles}>
        <SuccessStage funnel={funnel} />
      </div>
    );
  }

  if (!currentStage) {
    return null;
  }

  return (
    <InterventionProvider
      funnelId={funnel.id}
      sessionToken={session?.sessionToken}
      currentStage={currentStage.type}
    >
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
        style={{
          ...brandStyles,
          fontFamily: brandKit.typography.bodyFont
            ? `"${brandKit.typography.bodyFont}", system-ui, sans-serif`
            : 'system-ui, sans-serif',
        }}
      >
        {/* Load custom fonts from Google Fonts */}
        <FontLoader brandKit={brandKit} preconnect />

        {/* Demo Badge (shows when in demo mode) */}
        <DemoBadge isVisible={isDemoMode} />

        {/* Urgency Banner (shows at top when configured) */}
        <UrgencyBanner />

        {/* Header with branding */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <LogoDisplay
                brandKit={brandKit}
                context="full"
                size="md"
                companyName={funnel.company?.name || funnel.name}
              />

              {/* Cart indicator for product/checkout stages */}
              {currentStage.type !== 'LANDING' && cart.length > 0 && (
                <CartSummary />
              )}
            </div>
          </div>
        </header>

        {/* Progress bar */}
        {funnel.settings.behavior.showProgressBar && (
          <ProgressBar progress={progress} stages={funnel.stages} currentIndex={currentStage.order} />
        )}

        {/* Stage content */}
        <main className="flex-1">
          {renderStage(currentStage, funnel)}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {funnel.settings.urls?.termsUrl && (
                <a
                  href={funnel.settings.urls.termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Terms of Service
                </a>
              )}
              {funnel.settings.urls?.privacyUrl && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <a
                    href={funnel.settings.urls.privacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </>
              )}
              {funnel.settings.urls?.refundPolicyUrl && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <a
                    href={funnel.settings.urls.refundPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Refund Policy
                  </a>
                </>
              )}
              {/* Contact Us link - opens CS widget */}
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-gray-500 dark:text-gray-400">
                Contact Us (use widget below)
              </span>
            </div>
            {/* Copyright */}
            <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} {funnel.company?.name || 'All rights reserved'}
            </div>
          </div>
        </footer>

        {/* Customer Support Widget */}
        <CSWidget
          companyId={funnel.companyId}
          sessionToken={session?.sessionToken}
          funnelId={funnel.id}
        />
      </div>
    </InterventionProvider>
  );
}

function renderStage(stage: NonNullable<ReturnType<typeof useFunnel>['currentStage']>, funnel: Funnel) {
  switch (stage.type) {
    case 'LANDING':
      return <LandingStage stage={stage} funnel={funnel} />;
    case 'PRODUCT_SELECTION':
      return <ProductSelectionStage stage={stage} funnel={funnel} />;
    case 'CHECKOUT':
      return <CheckoutStage stage={stage} funnel={funnel} />;
    default:
      return <div>Unknown stage type</div>;
  }
}
