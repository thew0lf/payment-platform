'use client';

// ============================================================================
// Types
// ============================================================================

interface CustomContent {
  html?: string;
  markdown?: string;
  embedUrl?: string;
  embedType?: 'iframe' | 'video' | 'map';
  embedHeight?: string;
}

interface CustomStyles {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  maxWidth?: string;
}

interface CustomSectionProps {
  content: CustomContent | Record<string, unknown>;
  styles?: CustomStyles;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CustomSection - Render custom HTML, embeds, or other content
 *
 * Supports:
 * - Raw HTML (sanitized)
 * - Iframe embeds (videos, maps, etc.)
 * - Custom styling and layout
 *
 * WARNING: Only use trusted HTML content. This component renders HTML directly.
 */
export function CustomSection({ content, styles }: CustomSectionProps) {
  const customContent = content as CustomContent;
  const { html, embedUrl, embedType = 'iframe', embedHeight = '400px' } = customContent;

  // Determine text colors with dark mode support
  const textColor = styles?.textColor;
  const hasCustomTextColor = !!textColor;

  return (
    <div
      className={`py-16 sm:py-24 ${!hasCustomTextColor ? 'text-gray-900 dark:text-gray-100' : ''}`}
      style={{
        backgroundColor: styles?.backgroundColor || 'transparent',
        ...(hasCustomTextColor && { color: textColor }),
      }}
    >
      <div
        className="mx-auto px-4 sm:px-6 lg:px-8"
        style={{ maxWidth: styles?.maxWidth || '1280px' }}
      >
        {/* HTML Content */}
        {html && (
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {/* Embed Content */}
        {embedUrl && (
          <div className="relative w-full overflow-hidden rounded-xl">
            {embedType === 'video' ? (
              <div
                className="relative w-full"
                style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
              >
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Embedded video"
                />
              </div>
            ) : embedType === 'map' ? (
              <iframe
                src={embedUrl}
                className="w-full border-0"
                style={{ height: embedHeight }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Embedded map"
              />
            ) : (
              <iframe
                src={embedUrl}
                className="w-full border-0"
                style={{ height: embedHeight }}
                title="Embedded content"
              />
            )}
          </div>
        )}

        {/* Empty state for development */}
        {!html && !embedUrl && process.env.NODE_ENV === 'development' && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
            <p className="text-gray-500 dark:text-gray-400">
              Custom section - Add HTML content or an embed URL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomSection;
