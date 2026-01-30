'use client';

import { Funnel, FunnelStage, LandingStageConfig } from '@/lib/api';
import { useFunnel } from '@/contexts/funnel-context';
import { StarIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface LandingStageProps {
  stage: FunnelStage;
  funnel: Funnel;
}

export function LandingStage({ stage }: LandingStageProps) {
  const { nextStage, trackEvent } = useFunnel();
  const config = stage.config as LandingStageConfig;

  const handleCTA = () => {
    trackEvent('CTA_CLICKED', { stageId: stage.id });
    nextStage();
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {config.sections.map((section) => (
        <div key={section.id}>
          {renderSection(section, config, handleCTA)}
        </div>
      ))}
    </div>
  );
}

function renderSection(
  section: LandingStageConfig['sections'][0],
  config: LandingStageConfig,
  onCTA: () => void
) {
  switch (section.type) {
    case 'hero':
      return <HeroSection config={section.config} cta={config.cta} onCTA={onCTA} />;
    case 'features':
      return <FeaturesSection config={section.config} />;
    case 'testimonials':
      return <TestimonialsSection config={section.config} />;
    case 'faq':
      return <FAQSection config={section.config} />;
    case 'cta':
      return <CTASection config={section.config} cta={config.cta} onCTA={onCTA} />;
    default:
      return null;
  }
}

// Hero Section
function HeroSection({
  config,
  cta,
  onCTA,
}: {
  config: Record<string, unknown>;
  cta: LandingStageConfig['cta'];
  onCTA: () => void;
}) {
  const {
    headline = 'Welcome to Our Store',
    subheadline = 'Discover amazing products',
    backgroundImage,
    backgroundVideo,
  } = config as {
    headline?: string;
    subheadline?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
  };

  return (
    <section
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' } : undefined}
    >
      {backgroundVideo && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      )}

      <div className="relative max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          {headline}
        </h1>
        <p className="text-xl sm:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
          {subheadline}
        </p>

        <button
          onClick={onCTA}
          className={`
            px-8 py-4 text-lg font-semibold rounded-xl transition-all transform hover:scale-105
            ${cta.style === 'gradient'
              ? 'bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white shadow-lg'
              : cta.style === 'outline'
              ? 'border-2 border-white text-white hover:bg-white hover:text-gray-900'
              : 'bg-[var(--primary-color)] text-white hover:opacity-90 shadow-lg'
            }
          `}
        >
          {cta.text}
        </button>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection({ config }: { config: Record<string, unknown> }) {
  const {
    title = 'Why Choose Us',
    features = [],
  } = config as {
    title?: string;
    features?: Array<{ icon?: string; title: string; description: string }>;
  };

  const defaultFeatures = [
    { icon: '🚀', title: 'Fast Delivery', description: 'Get your order in 2-3 business days' },
    { icon: '✨', title: 'Premium Quality', description: 'Only the finest products' },
    { icon: '🔒', title: 'Secure Checkout', description: '100% secure payment processing' },
    { icon: '💯', title: 'Satisfaction Guaranteed', description: '30-day money-back guarantee' },
  ];

  const displayFeatures = features.length > 0 ? features : defaultFeatures;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayFeatures.map((feature, index) => (
            <div key={index} className="text-center p-6">
              <div className="text-4xl mb-4">{feature.icon || '✓'}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection({ config }: { config: Record<string, unknown> }) {
  const {
    title = 'What Our Customers Say',
    testimonials = [],
  } = config as {
    title?: string;
    testimonials?: Array<{ name: string; text: string; rating?: number; avatar?: string }>;
  };

  const defaultTestimonials: Array<{ name: string; text: string; rating?: number; avatar?: string }> = [
    { name: 'Sarah M.', text: 'Absolutely love the quality! Will definitely order again.', rating: 5 },
    { name: 'John D.', text: 'Fast shipping and excellent customer service.', rating: 5 },
    { name: 'Emily R.', text: 'Best purchase I\'ve made this year!', rating: 5 },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayTestimonials.map((testimonial, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                  <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">&quot;{testimonial.text}&quot;</p>
              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white font-medium">
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-gray-900 dark:text-gray-100">{testimonial.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection({ config }: { config: Record<string, unknown> }) {
  const {
    title = 'Frequently Asked Questions',
    faqs = [],
  } = config as {
    title?: string;
    faqs?: Array<{ question: string; answer: string }>;
  };

  const defaultFAQs = [
    { question: 'How long does shipping take?', answer: 'Standard shipping takes 2-3 business days.' },
    { question: 'What is your return policy?', answer: 'We offer a 30-day money-back guarantee.' },
    { question: 'Do you ship internationally?', answer: 'Yes, we ship to over 50 countries worldwide.' },
  ];

  const displayFAQs = faqs.length > 0 ? faqs : defaultFAQs;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">{title}</h2>
        <div className="space-y-4">
          {displayFAQs.map((faq, index) => (
            <details key={index} className="group bg-gray-50 dark:bg-gray-800 rounded-xl">
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{faq.question}</h3>
                <span className="ml-4 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 dark:text-gray-400">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection({
  config,
  cta,
  onCTA,
}: {
  config: Record<string, unknown>;
  cta: LandingStageConfig['cta'];
  onCTA: () => void;
}) {
  const {
    headline = 'Ready to Get Started?',
    subheadline = 'Join thousands of satisfied customers',
    benefits = [],
  } = config as {
    headline?: string;
    subheadline?: string;
    benefits?: string[];
  };

  const defaultBenefits = [
    'Free shipping on orders over $50',
    '30-day money-back guarantee',
    'Premium quality products',
  ];

  const displayBenefits = benefits.length > 0 ? benefits : defaultBenefits;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{headline}</h2>
        <p className="text-xl text-white/80 mb-8">{subheadline}</p>

        <ul className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 text-sm">
          {displayBenefits.map((benefit, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-300" />
              {benefit}
            </li>
          ))}
        </ul>

        <button
          onClick={onCTA}
          className="px-8 py-4 bg-white dark:bg-gray-100 text-[var(--primary-color)] text-lg font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors shadow-lg"
        >
          {cta.text}
        </button>
      </div>
    </section>
  );
}
