'use client';

import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  rating?: number;
}

interface TestimonialsContent {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
  layout?: 'grid' | 'carousel' | 'single';
  showRatings?: boolean;
}

interface TestimonialsStyles {
  backgroundColor?: string;
  textColor?: string;
  cardBackgroundColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface TestimonialsSectionProps {
  content: TestimonialsContent | Record<string, unknown>;
  styles?: TestimonialsStyles;
}

// ============================================================================
// Star Rating Component
// ============================================================================

interface StarRatingProps {
  rating: number;
  max?: number;
}

function StarRating({ rating, max = 5 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ============================================================================
// Testimonial Card Component
// ============================================================================

interface TestimonialCardProps {
  testimonial: Testimonial;
  showRatings?: boolean;
  cardBackgroundColor?: string;
}

function TestimonialCard({
  testimonial,
  showRatings,
  cardBackgroundColor,
}: TestimonialCardProps) {
  return (
    <div
      className={`p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${!cardBackgroundColor ? 'bg-white dark:bg-gray-800' : ''}`}
      style={cardBackgroundColor ? { backgroundColor: cardBackgroundColor } : undefined}
    >
      {/* Rating */}
      {showRatings && testimonial.rating && (
        <div className="mb-4">
          <StarRating rating={testimonial.rating} />
        </div>
      )}

      {/* Quote */}
      <blockquote className="mb-4 text-gray-700 dark:text-gray-300">
        <span className="text-[var(--lp-primary)] text-2xl font-serif">"</span>
        {testimonial.quote}
        <span className="text-[var(--lp-primary)] text-2xl font-serif">"</span>
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        {testimonial.avatarUrl ? (
          <img
            src={testimonial.avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--lp-primary)] bg-opacity-10 flex items-center justify-center text-[var(--lp-primary)] font-semibold">
            {testimonial.author.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{testimonial.author}</p>
          {(testimonial.role || testimonial.company) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {testimonial.role}
              {testimonial.role && testimonial.company && ' at '}
              {testimonial.company}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TestimonialsSection - Display customer testimonials in grid or carousel layout
 *
 * Supports:
 * - Grid layout (2-3 columns)
 * - Carousel with navigation
 * - Single featured testimonial
 * - Star ratings
 */
export function TestimonialsSection({ content, styles }: TestimonialsSectionProps) {
  const testimonialsContent = content as TestimonialsContent;
  const {
    title,
    subtitle,
    testimonials = [],
    layout = 'grid',
    showRatings = true,
  } = testimonialsContent;

  const [activeIndex, setActiveIndex] = useState(0);

  // Determine text colors with dark mode support
  const textColor = styles?.textColor;
  const hasCustomTextColor = !!textColor;

  // Carousel navigation
  const goToPrevious = () => {
    setActiveIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setActiveIndex((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1
    );
  };

  if (testimonials.length === 0) {
    return null;
  }

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

        {/* Grid layout */}
        {layout === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                showRatings={showRatings}
                cardBackgroundColor={styles?.cardBackgroundColor}
              />
            ))}
          </div>
        )}

        {/* Carousel layout */}
        {layout === 'carousel' && (
          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className="w-full flex-shrink-0 px-4"
                  >
                    <div className="max-w-2xl mx-auto">
                      <TestimonialCard
                        testimonial={testimonial}
                        showRatings={showRatings}
                        cardBackgroundColor={styles?.cardBackgroundColor}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            {testimonials.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 p-2 min-w-[44px] min-h-[44px] rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                  aria-label="Previous testimonial"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 p-2 min-w-[44px] min-h-[44px] rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                  aria-label="Next testimonial"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Dots indicator */}
            {testimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === activeIndex
                        ? 'bg-[var(--lp-primary)] w-6'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Single featured testimonial */}
        {layout === 'single' && testimonials[0] && (
          <div className="max-w-3xl mx-auto">
            <TestimonialCard
              testimonial={testimonials[0]}
              showRatings={showRatings}
              cardBackgroundColor={styles?.cardBackgroundColor}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default TestimonialsSection;
