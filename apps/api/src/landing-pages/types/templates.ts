/**
 * Landing Page Templates
 * Pre-built page templates with default sections
 */

import { SectionType, LandingPageTheme } from '@prisma/client';
import { SectionContent } from './landing-page.types';

export interface TemplateSection {
  type: SectionType;
  name: string;
  order: number;
  content: SectionContent;
  enabled: boolean;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  theme: LandingPageTheme;
  sections: TemplateSection[];
}

// ═══════════════════════════════════════════════════════════════
// STARTER TEMPLATE - Simple, clean business page
// ═══════════════════════════════════════════════════════════════

export const STARTER_TEMPLATE: PageTemplate = {
  id: 'starter',
  name: 'Starter',
  description: 'A clean, minimal template perfect for getting started quickly.',
  thumbnail: '/templates/starter-thumb.png',
  theme: 'STARTER',
  sections: [
    {
      type: SectionType.HEADER,
      name: 'Header',
      order: 0,
      enabled: true,
      content: {
        logoText: 'Your Brand',
        navLinks: [
          { text: 'Features', url: '#features' },
          { text: 'Pricing', url: '#pricing' },
          { text: 'FAQ', url: '#faq' },
        ],
        ctaText: 'Get Started',
        ctaUrl: '#cta',
        sticky: true,
      },
    },
    {
      type: SectionType.HERO_CENTERED,
      name: 'Hero',
      order: 1,
      enabled: true,
      content: {
        headline: 'Build Something Amazing',
        subheadline:
          'Create beautiful landing pages in minutes. No coding required.',
        ctaText: 'Start Free Trial',
        ctaUrl: '#signup',
        secondaryCtaText: 'Learn More',
        secondaryCtaUrl: '#features',
      },
    },
    {
      type: SectionType.FEATURES_GRID,
      name: 'Features',
      order: 2,
      enabled: true,
      content: {
        headline: 'Everything You Need',
        subheadline: 'Powerful features to help you build and grow.',
        items: [
          {
            icon: '⚡',
            title: 'Lightning Fast',
            description: 'Optimized for speed and performance.',
          },
          {
            icon: '🎨',
            title: 'Beautiful Design',
            description: 'Stunning templates that convert.',
          },
          {
            icon: '📱',
            title: 'Fully Responsive',
            description: 'Looks great on any device.',
          },
        ],
      },
    },
    {
      type: SectionType.STATS_COUNTER,
      name: 'Stats',
      order: 3,
      enabled: true,
      content: {
        headline: 'Trusted by Thousands',
        items: [
          { value: '10K', suffix: '+', label: 'Active Users' },
          { value: '99', suffix: '%', label: 'Uptime' },
          { value: '24', suffix: '/7', label: 'Support' },
          { value: '5', suffix: ' min', label: 'Setup Time' },
        ],
      },
    },
    {
      type: SectionType.TESTIMONIALS_CARDS,
      name: 'Testimonials',
      order: 4,
      enabled: true,
      content: {
        headline: 'What Our Customers Say',
        items: [
          {
            quote:
              'This product has completely transformed how we work. Highly recommended!',
            author: 'Sarah Johnson',
            role: 'CEO',
            company: 'TechCorp',
            rating: 5,
          },
          {
            quote:
              "The best investment we've made this year. Simple, powerful, and effective.",
            author: 'Michael Chen',
            role: 'Founder',
            company: 'StartupXYZ',
            rating: 5,
          },
        ],
      },
    },
    {
      type: SectionType.PRICING_TABLE,
      name: 'Pricing',
      order: 5,
      enabled: true,
      content: {
        headline: 'Simple, Transparent Pricing',
        subheadline: 'Choose the plan that works for you.',
        tiers: [
          {
            name: 'Starter',
            price: '$9',
            period: 'month',
            description: 'Perfect for individuals',
            features: ['1 Landing Page', 'Basic Analytics', 'Email Support'],
            ctaText: 'Get Started',
            ctaUrl: '#signup-starter',
          },
          {
            name: 'Pro',
            price: '$29',
            period: 'month',
            description: 'For growing businesses',
            features: [
              '10 Landing Pages',
              'Advanced Analytics',
              'Priority Support',
              'Custom Domains',
            ],
            ctaText: 'Start Free Trial',
            ctaUrl: '#signup-pro',
            highlighted: true,
          },
          {
            name: 'Enterprise',
            price: '$99',
            period: 'month',
            description: 'For large organizations',
            features: [
              'Unlimited Pages',
              'Full Analytics Suite',
              '24/7 Support',
              'Custom Branding',
              'API Access',
            ],
            ctaText: 'Contact Sales',
            ctaUrl: '#contact',
          },
        ],
      },
    },
    {
      type: SectionType.FAQ_ACCORDION,
      name: 'FAQ',
      order: 6,
      enabled: true,
      content: {
        headline: 'Frequently Asked Questions',
        items: [
          {
            question: 'How do I get started?',
            answer:
              "Simply sign up for a free account and you can start building your first landing page in minutes. No credit card required.",
          },
          {
            question: 'Can I use my own domain?',
            answer:
              'Yes! Pro and Enterprise plans support custom domains with free SSL certificates.',
          },
          {
            question: 'Is there a free trial?',
            answer:
              'Absolutely! We offer a 14-day free trial on all paid plans so you can try before you buy.',
          },
          {
            question: 'What payment methods do you accept?',
            answer:
              'We accept all major credit cards, PayPal, and bank transfers for enterprise customers.',
          },
        ],
      },
    },
    {
      type: SectionType.CTA_BANNER,
      name: 'Call to Action',
      order: 7,
      enabled: true,
      content: {
        headline: 'Ready to Get Started?',
        subheadline: 'Join thousands of satisfied customers today.',
        ctaText: 'Start Your Free Trial',
        ctaUrl: '#signup',
      },
    },
    {
      type: SectionType.FOOTER,
      name: 'Footer',
      order: 8,
      enabled: true,
      content: {
        logoText: 'Your Brand',
        columns: [
          {
            title: 'Product',
            links: [
              { text: 'Features', url: '#features' },
              { text: 'Pricing', url: '#pricing' },
              { text: 'FAQ', url: '#faq' },
            ],
          },
          {
            title: 'Company',
            links: [
              { text: 'About', url: '/about' },
              { text: 'Blog', url: '/blog' },
              { text: 'Contact', url: '/contact' },
            ],
          },
        ],
        social: [
          { platform: 'Twitter', url: 'https://twitter.com' },
          { platform: 'LinkedIn', url: 'https://linkedin.com' },
        ],
        copyright: '© 2024 Your Brand. All rights reserved.',
        legal: [
          { text: 'Privacy Policy', url: '/privacy' },
          { text: 'Terms of Service', url: '/terms' },
        ],
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// ARTISAN TEMPLATE - Elegant, craft-focused design
// ═══════════════════════════════════════════════════════════════

export const ARTISAN_TEMPLATE: PageTemplate = {
  id: 'artisan',
  name: 'Artisan',
  description:
    'An elegant template for artisans, craftspeople, and premium brands.',
  thumbnail: '/templates/artisan-thumb.png',
  theme: 'ARTISAN',
  sections: [
    {
      type: SectionType.HEADER,
      name: 'Header',
      order: 0,
      enabled: true,
      content: {
        logoText: 'Artisan Studio',
        navLinks: [
          { text: 'Our Story', url: '#story' },
          { text: 'Products', url: '#products' },
          { text: 'Process', url: '#process' },
          { text: 'Contact', url: '#contact' },
        ],
        ctaText: 'Shop Now',
        ctaUrl: '#shop',
        sticky: true,
      },
    },
    {
      type: SectionType.HERO_SPLIT,
      name: 'Hero',
      order: 1,
      enabled: true,
      content: {
        headline: 'Handcrafted with Love',
        subheadline:
          'Every piece tells a story. Discover our collection of handmade treasures, crafted with care and attention to detail.',
        ctaText: 'Explore Collection',
        ctaUrl: '#products',
        secondaryCtaText: 'Our Story',
        secondaryCtaUrl: '#story',
      },
    },
    {
      type: SectionType.FEATURES_LIST,
      name: 'What Makes Us Different',
      order: 2,
      enabled: true,
      content: {
        headline: 'The Artisan Difference',
        subheadline:
          'We believe in quality over quantity. Every item is made with purpose.',
        items: [
          {
            icon: '🌿',
            title: 'Sustainably Sourced',
            description:
              'All materials are ethically sourced from local suppliers who share our values.',
          },
          {
            icon: '✋',
            title: 'Handmade with Care',
            description:
              'Each piece is crafted by skilled artisans using traditional techniques passed down through generations.',
          },
          {
            icon: '♻️',
            title: 'Eco-Friendly',
            description:
              'We minimize waste and use recyclable packaging to protect our planet.',
          },
        ],
      },
    },
    {
      type: SectionType.TESTIMONIALS_WALL,
      name: 'Customer Stories',
      order: 3,
      enabled: true,
      content: {
        headline: 'Loved by Our Customers',
        items: [
          {
            quote:
              'The quality is unmatched. You can feel the care and craftsmanship in every detail.',
            author: 'Emma Wilson',
            role: 'Interior Designer',
            rating: 5,
          },
          {
            quote:
              "I've never owned anything quite like this. It's become a centerpiece of my home.",
            author: 'David Martinez',
            role: 'Collector',
            rating: 5,
          },
          {
            quote:
              'Supporting artisans who care about their craft is so important. This brand delivers.',
            author: 'Lisa Park',
            role: 'Blogger',
            rating: 5,
          },
        ],
      },
    },
    {
      type: SectionType.NEWSLETTER,
      name: 'Newsletter',
      order: 4,
      enabled: true,
      content: {
        headline: 'Join Our Community',
        subheadline:
          'Be the first to know about new collections, exclusive offers, and behind-the-scenes stories.',
        placeholderText: 'Your email address',
        buttonText: 'Subscribe',
        successMessage: "Thank you! You're now part of our community.",
      },
    },
    {
      type: SectionType.FOOTER,
      name: 'Footer',
      order: 5,
      enabled: true,
      content: {
        logoText: 'Artisan Studio',
        columns: [
          {
            title: 'Shop',
            links: [
              { text: 'New Arrivals', url: '/new' },
              { text: 'Best Sellers', url: '/best-sellers' },
              { text: 'Gift Cards', url: '/gift-cards' },
            ],
          },
          {
            title: 'About',
            links: [
              { text: 'Our Story', url: '/story' },
              { text: 'Artisans', url: '/artisans' },
              { text: 'Sustainability', url: '/sustainability' },
            ],
          },
        ],
        social: [
          { platform: 'Instagram', url: 'https://instagram.com' },
          { platform: 'Pinterest', url: 'https://pinterest.com' },
        ],
        copyright: '© 2024 Artisan Studio. Crafted with care.',
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// VELOCITY TEMPLATE - Bold, modern, tech-forward
// ═══════════════════════════════════════════════════════════════

export const VELOCITY_TEMPLATE: PageTemplate = {
  id: 'velocity',
  name: 'Velocity',
  description:
    'A bold, high-impact template for tech startups and innovative products.',
  thumbnail: '/templates/velocity-thumb.png',
  theme: 'VELOCITY',
  sections: [
    {
      type: SectionType.HEADER,
      name: 'Header',
      order: 0,
      enabled: true,
      content: {
        logoText: 'VELOCITY',
        navLinks: [
          { text: 'Features', url: '#features' },
          { text: 'How It Works', url: '#how-it-works' },
          { text: 'Pricing', url: '#pricing' },
        ],
        ctaText: 'Launch Now',
        ctaUrl: '#launch',
        sticky: true,
      },
    },
    {
      type: SectionType.HERO_CENTERED,
      name: 'Hero',
      order: 1,
      enabled: true,
      content: {
        headline: 'Move Fast. Build Faster.',
        subheadline:
          'The next-generation platform that accelerates your development workflow by 10x. Ship products in days, not months.',
        ctaText: 'Start Building',
        ctaUrl: '#signup',
        secondaryCtaText: 'Watch Demo',
        secondaryCtaUrl: '#demo',
      },
    },
    {
      type: SectionType.LOGOS_STRIP,
      name: 'Trusted By',
      order: 2,
      enabled: true,
      content: {
        headline: 'Trusted by Industry Leaders',
        items: [
          { name: 'TechCorp', image: '/logos/techcorp.svg' },
          { name: 'Startup Inc', image: '/logos/startup.svg' },
          { name: 'Global Co', image: '/logos/global.svg' },
          { name: 'InnovateTech', image: '/logos/innovate.svg' },
        ],
      },
    },
    {
      type: SectionType.FEATURES_ICONS,
      name: 'Key Features',
      order: 3,
      enabled: true,
      content: {
        headline: 'Built for Speed',
        subheadline: 'Every feature designed to maximize your velocity.',
        items: [
          {
            icon: '🚀',
            title: 'Instant Deployment',
            description: 'Deploy globally in seconds with zero configuration.',
          },
          {
            icon: '⚡',
            title: 'Edge Computing',
            description: 'Run your code at the edge for sub-millisecond latency.',
          },
          {
            icon: '🔒',
            title: 'Enterprise Security',
            description: 'SOC 2 compliant with end-to-end encryption.',
          },
          {
            icon: '📊',
            title: 'Real-time Analytics',
            description: 'Monitor everything with live dashboards and alerts.',
          },
          {
            icon: '🔄',
            title: 'Auto Scaling',
            description:
              'Automatically scale from zero to millions of users.',
          },
          {
            icon: '🛠️',
            title: 'Developer Tools',
            description: 'CLI, SDKs, and APIs for every language and framework.',
          },
        ],
      },
    },
    {
      type: SectionType.STATS_COUNTER,
      name: 'By The Numbers',
      order: 4,
      enabled: true,
      content: {
        items: [
          { value: '50', suffix: 'ms', label: 'Average Response Time' },
          { value: '99.99', suffix: '%', label: 'Uptime SLA' },
          { value: '1M', suffix: '+', label: 'Deployments / Month' },
          { value: '200', suffix: '+', label: 'Edge Locations' },
        ],
      },
    },
    {
      type: SectionType.PRICING_COMPARISON,
      name: 'Pricing',
      order: 5,
      enabled: true,
      content: {
        headline: 'Scale Without Limits',
        subheadline:
          'Pay only for what you use. No hidden fees. Cancel anytime.',
        tiers: [
          {
            name: 'Developer',
            price: 'Free',
            description: 'For side projects',
            features: [
              '1,000 deployments/month',
              '100GB bandwidth',
              'Community support',
            ],
            ctaText: 'Get Started',
            ctaUrl: '#free',
          },
          {
            name: 'Team',
            price: '$49',
            period: 'month',
            description: 'For growing teams',
            features: [
              'Unlimited deployments',
              '1TB bandwidth',
              'Team collaboration',
              'Priority support',
            ],
            ctaText: 'Start Trial',
            ctaUrl: '#team',
            highlighted: true,
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            description: 'For large organizations',
            features: [
              'Everything in Team',
              'Custom SLA',
              'Dedicated support',
              'On-premise option',
            ],
            ctaText: 'Contact Us',
            ctaUrl: '#enterprise',
          },
        ],
      },
    },
    {
      type: SectionType.CTA_SPLIT,
      name: 'Final CTA',
      order: 6,
      enabled: true,
      content: {
        headline: 'Ready to Accelerate?',
        subheadline:
          "Join thousands of developers shipping faster than ever. Get started in under 5 minutes.",
        ctaText: 'Start Building for Free',
        ctaUrl: '#signup',
      },
    },
    {
      type: SectionType.FOOTER,
      name: 'Footer',
      order: 7,
      enabled: true,
      content: {
        logoText: 'VELOCITY',
        columns: [
          {
            title: 'Product',
            links: [
              { text: 'Features', url: '/features' },
              { text: 'Pricing', url: '/pricing' },
              { text: 'Changelog', url: '/changelog' },
              { text: 'Roadmap', url: '/roadmap' },
            ],
          },
          {
            title: 'Developers',
            links: [
              { text: 'Documentation', url: '/docs' },
              { text: 'API Reference', url: '/api' },
              { text: 'Status', url: '/status' },
            ],
          },
          {
            title: 'Company',
            links: [
              { text: 'About', url: '/about' },
              { text: 'Blog', url: '/blog' },
              { text: 'Careers', url: '/careers' },
            ],
          },
        ],
        social: [
          { platform: 'Twitter', url: 'https://twitter.com' },
          { platform: 'GitHub', url: 'https://github.com' },
          { platform: 'Discord', url: 'https://discord.com' },
        ],
        copyright: '© 2024 Velocity Inc. All rights reserved.',
        legal: [
          { text: 'Privacy', url: '/privacy' },
          { text: 'Terms', url: '/terms' },
        ],
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// LUXE TEMPLATE - Premium, sophisticated, luxury
// ═══════════════════════════════════════════════════════════════

export const LUXE_TEMPLATE: PageTemplate = {
  id: 'luxe',
  name: 'Luxe',
  description:
    'A sophisticated template for luxury brands and premium services.',
  thumbnail: '/templates/luxe-thumb.png',
  theme: 'LUXE',
  sections: [
    {
      type: SectionType.HEADER,
      name: 'Header',
      order: 0,
      enabled: true,
      content: {
        logoText: 'LUXE',
        navLinks: [
          { text: 'Collection', url: '#collection' },
          { text: 'Experience', url: '#experience' },
          { text: 'Atelier', url: '#atelier' },
          { text: 'Contact', url: '#contact' },
        ],
        ctaText: 'Book Consultation',
        ctaUrl: '#book',
        sticky: true,
      },
    },
    {
      type: SectionType.HERO_VIDEO,
      name: 'Hero',
      order: 1,
      enabled: true,
      content: {
        headline: 'Redefining Excellence',
        subheadline:
          'Where timeless elegance meets modern sophistication. Experience luxury without compromise.',
        ctaText: 'Discover More',
        ctaUrl: '#collection',
      },
    },
    {
      type: SectionType.FEATURES_LIST,
      name: 'The Experience',
      order: 2,
      enabled: true,
      content: {
        headline: 'The Art of Refinement',
        items: [
          {
            icon: '✨',
            title: 'Exquisite Craftsmanship',
            description:
              'Each creation is meticulously handcrafted by master artisans with decades of experience.',
          },
          {
            icon: '💎',
            title: 'Rare Materials',
            description:
              'We source only the finest materials from around the world, ensuring unparalleled quality.',
          },
          {
            icon: '🎯',
            title: 'Bespoke Service',
            description:
              'Every piece is customized to your exact specifications, creating something truly unique.',
          },
        ],
      },
    },
    {
      type: SectionType.TESTIMONIALS_CAROUSEL,
      name: 'Testimonials',
      order: 3,
      enabled: true,
      content: {
        headline: 'Distinguished Clientele',
        items: [
          {
            quote:
              'An unparalleled experience from start to finish. The attention to detail is remarkable.',
            author: 'Victoria Sterling',
            role: 'Art Collector',
            rating: 5,
          },
          {
            quote:
              'They understood my vision perfectly and exceeded every expectation.',
            author: 'Alexander Rhodes',
            role: 'CEO',
            company: 'Rhodes Capital',
            rating: 5,
          },
        ],
      },
    },
    {
      type: SectionType.CTA_BANNER,
      name: 'Private Consultation',
      order: 4,
      enabled: true,
      content: {
        headline: 'Experience the Extraordinary',
        subheadline:
          'Schedule a private consultation at our atelier and begin your bespoke journey.',
        ctaText: 'Request an Appointment',
        ctaUrl: '#appointment',
      },
    },
    {
      type: SectionType.FOOTER,
      name: 'Footer',
      order: 5,
      enabled: true,
      content: {
        logoText: 'LUXE',
        columns: [
          {
            title: 'Discover',
            links: [
              { text: 'Collections', url: '/collections' },
              { text: 'Heritage', url: '/heritage' },
              { text: 'Atelier', url: '/atelier' },
            ],
          },
          {
            title: 'Services',
            links: [
              { text: 'Bespoke', url: '/bespoke' },
              { text: 'Consultations', url: '/consultations' },
              { text: 'Care Guide', url: '/care' },
            ],
          },
        ],
        social: [
          { platform: 'Instagram', url: 'https://instagram.com' },
        ],
        copyright: '© 2024 LUXE. All rights reserved.',
        legal: [
          { text: 'Privacy', url: '/privacy' },
          { text: 'Terms', url: '/terms' },
        ],
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════

export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  starter: STARTER_TEMPLATE,
  artisan: ARTISAN_TEMPLATE,
  velocity: VELOCITY_TEMPLATE,
  luxe: LUXE_TEMPLATE,
};

export const TEMPLATE_LIST = Object.values(PAGE_TEMPLATES);

/**
 * Get a template by ID
 */
export function getTemplateById(templateId: string): PageTemplate | undefined {
  return PAGE_TEMPLATES[templateId];
}

/**
 * Get templates filtered by theme
 */
export function getTemplatesByTheme(theme: LandingPageTheme): PageTemplate[] {
  return TEMPLATE_LIST.filter((t) => t.theme === theme);
}
