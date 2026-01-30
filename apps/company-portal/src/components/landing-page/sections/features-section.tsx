'use client';

// ============================================================================
// Types
// ============================================================================

interface Feature {
  id: string;
  icon?: string;
  iconType?: 'emoji' | 'svg' | 'image';
  title: string;
  description: string;
}

interface FeaturesContent {
  title?: string;
  subtitle?: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'list' | 'cards';
}

interface FeaturesStyles {
  backgroundColor?: string;
  textColor?: string;
  cardBackgroundColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface FeaturesSectionProps {
  content: FeaturesContent | Record<string, unknown>;
  styles?: FeaturesStyles;
}

// ============================================================================
// Icon Component
// ============================================================================

interface FeatureIconProps {
  icon?: string;
  iconType?: 'emoji' | 'svg' | 'image';
  title: string;
}

function FeatureIcon({ icon, iconType = 'emoji', title }: FeatureIconProps) {
  if (!icon) {
    // Default icon
    return (
      <div className="w-12 h-12 rounded-lg bg-[var(--lp-primary)] bg-opacity-10 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-[var(--lp-primary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    );
  }

  if (iconType === 'emoji') {
    return (
      <div className="w-12 h-12 rounded-lg bg-[var(--lp-primary)] bg-opacity-10 flex items-center justify-center text-2xl">
        {icon}
      </div>
    );
  }

  if (iconType === 'image') {
    return (
      <div className="w-12 h-12 rounded-lg overflow-hidden">
        <img src={icon} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  // SVG - render as dangerouslySetInnerHTML (trusted content only)
  return (
    <div
      className="w-12 h-12 rounded-lg bg-[var(--lp-primary)] bg-opacity-10 flex items-center justify-center text-[var(--lp-primary)]"
      dangerouslySetInnerHTML={{ __html: icon }}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FeaturesSection - Display product/service features in a grid or list layout
 *
 * Supports:
 * - 2, 3, or 4 column grid layouts
 * - Emoji, SVG, or image icons
 * - Card-style or minimal list layouts
 */
export function FeaturesSection({ content, styles }: FeaturesSectionProps) {
  const featuresContent = content as FeaturesContent;
  const {
    title,
    subtitle,
    features = [],
    columns = 3,
    layout = 'grid',
  } = featuresContent;

  // Column classes based on count
  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };

  // Determine text colors with dark mode support
  const textColor = styles?.textColor;
  const hasCustomTextColor = !!textColor;

  return (
    <div
      className="py-16 sm:py-24"
      style={{
        backgroundColor: styles?.backgroundColor || 'transparent',
        ...(hasCustomTextColor && { color: textColor }),
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {(title || subtitle) && (
          <div className="text-center mb-12 sm:mb-16">
            {title && (
              <h2
                className={`text-3xl sm:text-4xl font-bold mb-4 ${!hasCustomTextColor ? 'text-gray-900 dark:text-gray-100' : ''}`}
                style={{
                  fontFamily: 'var(--lp-heading-font), system-ui, sans-serif',
                  ...(hasCustomTextColor && { color: textColor }),
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={`text-lg max-w-2xl mx-auto ${!hasCustomTextColor ? 'text-gray-600 dark:text-gray-400' : ''}`}
                style={hasCustomTextColor ? { color: `color-mix(in srgb, ${textColor} 70%, transparent)` } : undefined}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Features grid */}
        {layout === 'grid' || layout === 'cards' ? (
          <div className={`grid grid-cols-1 ${columnClasses[columns]} gap-8`}>
            {features.map((feature) => (
              <div
                key={feature.id}
                className={`
                  ${layout === 'cards' ? 'p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700' : ''}
                `}
                style={{
                  backgroundColor:
                    layout === 'cards'
                      ? styles?.cardBackgroundColor || undefined
                      : 'transparent',
                }}
              >
                <FeatureIcon
                  icon={feature.icon}
                  iconType={feature.iconType}
                  title={feature.title}
                />
                <h3
                  className={`mt-4 text-lg font-semibold ${!hasCustomTextColor ? 'text-gray-900 dark:text-gray-100' : ''}`}
                  style={hasCustomTextColor ? { color: textColor } : undefined}
                >
                  {feature.title}
                </h3>
                <p
                  className={`mt-2 ${!hasCustomTextColor ? 'text-gray-600 dark:text-gray-400' : ''}`}
                  style={hasCustomTextColor ? { color: `color-mix(in srgb, ${textColor} 70%, transparent)` } : undefined}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* List layout */
          <div className="space-y-6 max-w-3xl mx-auto">
            {features.map((feature) => (
              <div key={feature.id} className="flex gap-4">
                <div className="flex-shrink-0">
                  <FeatureIcon
                    icon={feature.icon}
                    iconType={feature.iconType}
                    title={feature.title}
                  />
                </div>
                <div>
                  <h3
                    className={`text-lg font-semibold ${!hasCustomTextColor ? 'text-gray-900 dark:text-gray-100' : ''}`}
                    style={hasCustomTextColor ? { color: textColor } : undefined}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`mt-1 ${!hasCustomTextColor ? 'text-gray-600 dark:text-gray-400' : ''}`}
                    style={hasCustomTextColor ? { color: `color-mix(in srgb, ${textColor} 70%, transparent)` } : undefined}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeaturesSection;
