'use client';

// ============================================================================
// Types
// ============================================================================

export interface TrustBadge {
  id: string;
  type: 'secure-checkout' | 'money-back' | 'customer-support' | 'fast-shipping' | 'verified' | 'ssl' | 'custom';
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface LandingPageTrustSignalsProps {
  /** Trust badges to display */
  badges?: TrustBadge[];
  /** Layout direction */
  layout?: 'horizontal' | 'vertical' | 'grid';
  /** Show labels */
  showLabels?: boolean;
  /** Optional className */
  className?: string;
  /** Variant style */
  variant?: 'minimal' | 'detailed' | 'icons-only';
}

// ============================================================================
// Default Trust Badges
// ============================================================================

const defaultBadges: TrustBadge[] = [
  {
    id: 'secure',
    type: 'secure-checkout',
    label: 'Secure Checkout',
    description: '256-bit SSL encryption',
  },
  {
    id: 'money-back',
    type: 'money-back',
    label: '30-Day Money Back',
    description: 'No questions asked',
  },
  {
    id: 'support',
    type: 'customer-support',
    label: '24/7 Support',
    description: 'Always here to help',
  },
];

// ============================================================================
// Badge Icon Component
// ============================================================================

function BadgeIcon({ type }: { type: TrustBadge['type'] }) {
  const iconClass = 'h-6 w-6';

  switch (type) {
    case 'secure-checkout':
    case 'ssl':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case 'money-back':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'customer-support':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'fast-shipping':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'verified':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageTrustSignals - Trust badges and security indicators
 *
 * Features:
 * - Pre-built common trust badges
 * - Custom badge support
 * - Multiple layout options
 * - Multiple style variants
 */
export function LandingPageTrustSignals({
  badges = defaultBadges,
  layout = 'horizontal',
  showLabels = true,
  className = '',
  variant = 'minimal',
}: LandingPageTrustSignalsProps) {
  // Layout styles
  const layoutStyles = {
    horizontal: 'flex flex-wrap items-center justify-center gap-4 md:gap-6',
    vertical: 'flex flex-col items-center gap-3',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-4',
  };

  // Badge styles based on variant
  const badgeStyles = {
    minimal: 'flex items-center gap-2 text-gray-600',
    detailed: 'flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-lg text-center',
    'icons-only': 'p-2 text-gray-400 hover:text-gray-600 transition-colors',
  };

  return (
    <div
      className={`${layoutStyles[layout]} ${className}`}
      role="list"
      aria-label="Trust signals"
    >
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={badgeStyles[variant]}
          role="listitem"
        >
          {/* Icon */}
          <span className={`flex-shrink-0 ${variant === 'detailed' ? 'text-[var(--lp-primary,#667eea)]' : ''}`}>
            {badge.icon || <BadgeIcon type={badge.type} />}
          </span>

          {/* Label and Description */}
          {(showLabels || variant === 'detailed') && variant !== 'icons-only' && (
            <div>
              <span className={`text-sm font-medium ${variant === 'detailed' ? 'text-gray-900' : ''}`}>
                {badge.label}
              </span>
              {variant === 'detailed' && badge.description && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {badge.description}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default LandingPageTrustSignals;
