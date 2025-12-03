'use client';

import type { FunnelStage, Funnel } from '@/lib/api';

interface Props {
  stage: FunnelStage;
  funnel: Funnel;
  onAdvance: (data?: Record<string, unknown>) => void;
}

interface LandingConfig {
  layout?: 'hero-cta' | 'video-hero' | 'split';
  headline?: string;
  subheadline?: string;
  heroImage?: string;
  videoUrl?: string;
  cta?: {
    text?: string;
    style?: 'solid' | 'outline' | 'gradient';
  };
  features?: Array<{
    icon?: string;
    title: string;
    description: string;
  }>;
  testimonials?: Array<{
    name: string;
    role?: string;
    content: string;
    avatar?: string;
  }>;
}

export function LandingStage({ stage, funnel, onAdvance }: Props) {
  const config = (stage.config || {}) as LandingConfig;
  const branding = funnel.settings?.branding || {};

  const ctaText = config.cta?.text || 'Get Started';

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            {/* Logo */}
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt={funnel.company.name}
                className="h-12 mx-auto mb-8"
              />
            )}

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {config.headline || funnel.name}
            </h1>

            {/* Subheadline */}
            {config.subheadline && (
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                {config.subheadline}
              </p>
            )}

            {/* Hero Image */}
            {config.heroImage && (
              <div className="mb-8">
                <img
                  src={config.heroImage}
                  alt=""
                  className="max-w-full mx-auto rounded-lg shadow-xl"
                />
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={() => onAdvance()}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white rounded-lg transition-all hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: branding.primaryColor || '#000000' }}
            >
              {ctaText}
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {config.features && config.features.length > 0 && (
        <section className="py-16 px-4 md:px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {config.features.map((feature, index) => (
                <div key={index} className="text-center p-6">
                  {feature.icon && (
                    <div className="text-4xl mb-4">{feature.icon}</div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {config.testimonials && config.testimonials.length > 0 && (
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              What Our Customers Say
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {config.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    {testimonial.avatar ? (
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 mr-4 flex items-center justify-center">
                        <span className="text-xl font-semibold text-gray-500">
                          {testimonial.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {testimonial.name}
                      </p>
                      {testimonial.role && (
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="py-16 px-4 md:px-8 bg-gray-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-300 mb-8">
            Join thousands of satisfied customers today.
          </p>
          <button
            onClick={() => onAdvance()}
            className="inline-flex items-center px-8 py-4 text-lg font-semibold bg-white text-gray-900 rounded-lg transition-all hover:scale-105 hover:shadow-lg"
          >
            {ctaText}
          </button>
        </div>
      </section>
    </div>
  );
}
